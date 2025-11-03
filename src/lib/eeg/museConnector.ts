/**
 * MuseConnector - Web Bluetooth API integration for Muse S headband
 *
 * Implements real-time EEG data streaming at 256 Hz with 5 channels:
 * - TP9 (left ear)
 * - AF7 (left forehead)
 * - AF8 (right forehead)
 * - TP10 (right ear)
 * - AUX (reference)
 *
 * Features:
 * - Connection management with auto-reconnect
 * - Battery level monitoring
 * - RxJS observables for data streams
 * - Proper error handling and event listeners
 */

import { BehaviorSubject, Subject, fromEvent, merge } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

// Muse S Bluetooth UUIDs (official specification)
const MUSE_SERVICE_UUID = '0000fe89-0000-1000-8000-00805f9b34fb';

const CHARACTERISTIC_UUIDS = {
  // EEG channels (256 Hz sampling rate)
  TP9: '273e0003-4c4d-454d-96be-f03bac821358',  // Left ear
  AF7: '273e0004-4c4d-454d-96be-f03bac821358',  // Left forehead
  AF8: '273e0005-4c4d-454d-96be-f03bac821358',  // Right forehead
  TP10: '273e0006-4c4d-454d-96be-f03bac821358', // Right ear
  AUX: '273e0007-4c4d-454d-96be-f03bac821358',  // Reference

  // Control characteristics
  CONTROL: '273e0001-4c4d-454d-96be-f03bac821358',
  TELEMETRY: '273e000b-4c4d-454d-96be-f03bac821358',
  BATTERY: '00002a19-0000-1000-8000-00805f9b34fb',
} as const;

// EEG channel names
export type EEGChannel = 'TP9' | 'AF7' | 'AF8' | 'TP10' | 'AUX';
export const EEG_CHANNELS: readonly EEGChannel[] = ['TP9', 'AF7', 'AF8', 'TP10', 'AUX'] as const;

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  STREAMING = 'STREAMING',
  ERROR = 'ERROR',
}

// Data interfaces
export interface EEGSample {
  channel: EEGChannel;
  value: number;
  timestamp: number;
  sequenceNumber: number;
}

export interface BatteryLevel {
  level: number; // 0-100
  timestamp: number;
}

export interface ConnectionInfo {
  state: ConnectionState;
  device?: BluetoothDevice;
  lastError?: Error;
}

// Configuration
export interface MuseConfig {
  autoReconnect?: boolean;
  reconnectDelay?: number; // milliseconds
  batteryCheckInterval?: number; // milliseconds
  enabledChannels?: EEGChannel[];
}

const DEFAULT_CONFIG: Required<MuseConfig> = {
  autoReconnect: true,
  reconnectDelay: 2000,
  batteryCheckInterval: 30000,
  enabledChannels: [...EEG_CHANNELS],
};

/**
 * MuseConnector - Main class for Muse S headband integration
 */
export class MuseConnector {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();

  private config: Required<MuseConfig>;
  private destroyed$ = new Subject<void>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private batteryCheckInterval: NodeJS.Timeout | null = null;

  // Sequence tracking for data integrity
  private sequenceNumbers: Map<EEGChannel, number> = new Map();

  // Observables
  public connectionState$ = new BehaviorSubject<ConnectionInfo>({
    state: ConnectionState.DISCONNECTED,
  });

  public eegData$ = new Subject<EEGSample>();
  public batteryLevel$ = new BehaviorSubject<BatteryLevel>({ level: 0, timestamp: 0 });

  constructor(config: MuseConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSequenceNumbers();
  }

  /**
   * Initialize sequence number tracking for all channels
   */
  private initializeSequenceNumbers(): void {
    EEG_CHANNELS.forEach(channel => {
      this.sequenceNumbers.set(channel, 0);
    });
  }

  /**
   * Check if Web Bluetooth API is available
   */
  public static isBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Connect to Muse S headband
   */
  public async connect(): Promise<void> {
    if (!MuseConnector.isBluetoothAvailable()) {
      throw new Error('Web Bluetooth API not available in this browser');
    }

    try {
      this.updateConnectionState(ConnectionState.CONNECTING);

      // Request device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MUSE_SERVICE_UUID] }],
        optionalServices: [MUSE_SERVICE_UUID],
      });

      if (!this.device.gatt) {
        throw new Error('GATT server not available');
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();
      this.service = await this.server.getPrimaryService(MUSE_SERVICE_UUID);

      // Set up disconnect listener
      this.setupDisconnectListener();

      // Initialize characteristics
      await this.initializeCharacteristics();

      this.updateConnectionState(ConnectionState.CONNECTED);

      // Start streaming
      await this.startStreaming();

    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Set up disconnect event listener with auto-reconnect
   */
  private setupDisconnectListener(): void {
    if (!this.device) return;

    const disconnect$ = fromEvent(this.device, 'gattserverdisconnected');

    disconnect$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      console.log('Muse device disconnected');
      this.handleDisconnect();
    });
  }

  /**
   * Initialize all required characteristics
   */
  private async initializeCharacteristics(): Promise<void> {
    if (!this.service) {
      throw new Error('Service not initialized');
    }

    try {
      // Get all EEG channel characteristics
      for (const channel of this.config.enabledChannels) {
        const uuid = CHARACTERISTIC_UUIDS[channel];
        const char = await this.service.getCharacteristic(uuid);
        this.characteristics.set(channel, char);
      }

      // Get control characteristic
      const controlChar = await this.service.getCharacteristic(CHARACTERISTIC_UUIDS.CONTROL);
      this.characteristics.set('CONTROL', controlChar);

      // Get battery characteristic
      const batteryChar = await this.service.getCharacteristic(CHARACTERISTIC_UUIDS.BATTERY);
      this.characteristics.set('BATTERY', batteryChar);

      console.log('All characteristics initialized');

    } catch (error) {
      throw new Error(`Failed to initialize characteristics: ${(error as Error).message}`);
    }
  }

  /**
   * Start EEG data streaming
   */
  private async startStreaming(): Promise<void> {
    if (!this.service) {
      throw new Error('Service not initialized');
    }

    try {
      // Enable notifications for all EEG channels
      for (const channel of this.config.enabledChannels) {
        const char = this.characteristics.get(channel);
        if (!char) continue;

        await char.startNotifications();

        // Set up data listener
        const listener = fromEvent(char, 'characteristicvaluechanged').pipe(
          map((event) => this.parseEEGData(event as Event, channel)),
          filter((sample): sample is EEGSample => sample !== null),
          takeUntil(this.destroyed$)
        );

        listener.subscribe(sample => this.eegData$.next(sample));
      }

      // Start battery monitoring
      this.startBatteryMonitoring();

      this.updateConnectionState(ConnectionState.STREAMING);
      console.log('Streaming started');

    } catch (error) {
      throw new Error(`Failed to start streaming: ${(error as Error).message}`);
    }
  }

  /**
   * Parse EEG data from characteristic value
   * Muse S sends 12 samples per notification (256 Hz / ~21 notifications per second)
   */
  private parseEEGData(event: Event, channel: EEGChannel): EEGSample | null {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (!value || value.byteLength < 20) {
      return null;
    }

    // Parse the data packet
    // Format: [index (uint16)] + [samples (12 x int16)]
    const dataView = new DataView(value.buffer);
    const packetIndex = dataView.getUint16(0, true);

    // Get current sequence number
    const currentSeq = this.sequenceNumbers.get(channel) || 0;
    this.sequenceNumbers.set(channel, currentSeq + 1);

    // Parse samples (12 samples per packet)
    const samples: EEGSample[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < 12; i++) {
      const offset = 2 + (i * 2); // Skip index, then 2 bytes per sample
      if (offset + 1 >= value.byteLength) break;

      const rawValue = dataView.getInt16(offset, true);

      // Convert to microvolts (Muse S scale: 0.48828125 µV/bit)
      const microvolts = rawValue * 0.48828125;

      samples.push({
        channel,
        value: microvolts,
        timestamp: timestamp + (i * 3.90625), // 256 Hz = 3.90625 ms per sample
        sequenceNumber: currentSeq * 12 + i,
      });
    }

    // Return first sample (others will be emitted separately if needed)
    return samples[0] || null;
  }

  /**
   * Start battery level monitoring
   */
  private startBatteryMonitoring(): void {
    const batteryChar = this.characteristics.get('BATTERY');
    if (!batteryChar) return;

    // Initial read
    this.readBatteryLevel();

    // Set up periodic checks
    this.batteryCheckInterval = setInterval(() => {
      this.readBatteryLevel();
    }, this.config.batteryCheckInterval);
  }

  /**
   * Read current battery level
   */
  private async readBatteryLevel(): Promise<void> {
    const batteryChar = this.characteristics.get('BATTERY');
    if (!batteryChar) return;

    try {
      const value = await batteryChar.readValue();
      const level = value.getUint8(0);

      this.batteryLevel$.next({
        level,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Failed to read battery level:', error);
    }
  }

  /**
   * Stop EEG data streaming
   */
  private async stopStreaming(): Promise<void> {
    try {
      // Stop notifications for all channels
      for (const [key, char] of this.characteristics.entries()) {
        if (EEG_CHANNELS.includes(key as EEGChannel)) {
          await char.stopNotifications();
        }
      }

      // Clear battery monitoring
      if (this.batteryCheckInterval) {
        clearInterval(this.batteryCheckInterval);
        this.batteryCheckInterval = null;
      }

      console.log('Streaming stopped');

    } catch (error) {
      console.error('Error stopping streaming:', error);
    }
  }

  /**
   * Disconnect from device
   */
  public async disconnect(): Promise<void> {
    this.config.autoReconnect = false; // Disable auto-reconnect

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    await this.stopStreaming();

    if (this.server?.connected) {
      this.server.disconnect();
    }

    this.cleanup();
    this.updateConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Handle disconnection event
   */
  private handleDisconnect(): void {
    this.cleanup();
    this.updateConnectionState(ConnectionState.DISCONNECTED);

    if (this.config.autoReconnect) {
      console.log(`Attempting reconnection in ${this.config.reconnectDelay}ms...`);
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.config.reconnectDelay);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    console.error('Connection error:', error);
    this.updateConnectionState(ConnectionState.ERROR, error);
    this.cleanup();
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: ConnectionState, error?: Error): void {
    this.connectionState$.next({
      state,
      device: this.device || undefined,
      lastError: error,
    });
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.characteristics.clear();
    this.service = null;
    this.server = null;

    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval);
      this.batteryCheckInterval = null;
    }
  }

  /**
   * Destroy connector and release all resources
   */
  public destroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.disconnect().catch(error => {
      console.error('Error during cleanup:', error);
    });

    this.eegData$.complete();
    this.batteryLevel$.complete();
    this.connectionState$.complete();
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState$.value.state;
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.server?.connected || false;
  }

  /**
   * Get device information
   */
  public getDeviceInfo(): { name?: string; id?: string } | null {
    if (!this.device) return null;

    return {
      name: this.device.name,
      id: this.device.id,
    };
  }
}
