/**
 * Web Bluetooth API Mock Utilities
 *
 * Provides mock implementations for testing Muse headband connection
 * without requiring actual hardware.
 */

export interface MockBluetoothDevice {
  id: string;
  name: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<MockBluetoothRemoteGATTServer>;
    disconnect: () => void;
  };
}

export interface MockBluetoothRemoteGATTServer {
  connected: boolean;
  device: MockBluetoothDevice;
  getPrimaryService: (uuid: string) => Promise<MockBluetoothRemoteGATTService>;
}

export interface MockBluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic: (uuid: string) => Promise<MockBluetoothRemoteGATTCharacteristic>;
}

export interface MockBluetoothRemoteGATTCharacteristic {
  uuid: string;
  value?: DataView;
  startNotifications: () => Promise<void>;
  stopNotifications: () => Promise<void>;
  addEventListener: (event: string, callback: (event: Event) => void) => void;
  removeEventListener: (event: string, callback: (event: Event) => void) => void;
}

/**
 * Injects Web Bluetooth API mock into the page context
 */
export async function injectBluetoothMock(page: any) {
  await page.addInitScript(() => {
    // Mock Bluetooth device data
    const mockDevices = [
      {
        id: 'mock-muse-1',
        name: 'Muse-ABCD',
        gatt: null as any,
      },
    ];

    // Mock GATT server
    class MockGATTServer {
      connected = false;
      device: any;

      constructor(device: any) {
        this.device = device;
      }

      async connect() {
        this.connected = true;
        return this;
      }

      disconnect() {
        this.connected = false;
      }

      async getPrimaryService(uuid: string) {
        return new MockGATTService(uuid);
      }
    }

    // Mock GATT service
    class MockGATTService {
      uuid: string;

      constructor(uuid: string) {
        this.uuid = uuid;
      }

      async getCharacteristic(uuid: string) {
        return new MockGATTCharacteristic(uuid);
      }
    }

    // Mock GATT characteristic with EEG data simulation
    class MockGATTCharacteristic {
      uuid: string;
      value?: DataView;
      private listeners = new Map<string, Set<Function>>();
      private notificationInterval?: NodeJS.Timeout;

      constructor(uuid: string) {
        this.uuid = uuid;
      }

      async startNotifications() {
        // Simulate EEG data notifications
        this.notificationInterval = setInterval(() => {
          // Generate mock EEG data (4 channels, 12-bit resolution)
          const data = new Uint8Array(20);
          for (let i = 0; i < 20; i++) {
            data[i] = Math.floor(Math.random() * 256);
          }

          this.value = new DataView(data.buffer);

          // Dispatch characteristicvaluechanged event
          const event = new Event('characteristicvaluechanged');
          (event as any).target = { value: this.value };

          const listeners = this.listeners.get('characteristicvaluechanged');
          if (listeners) {
            listeners.forEach(callback => callback(event));
          }
        }, 4); // ~250 Hz sampling rate

        return Promise.resolve();
      }

      async stopNotifications() {
        if (this.notificationInterval) {
          clearInterval(this.notificationInterval);
          this.notificationInterval = undefined;
        }
        return Promise.resolve();
      }

      addEventListener(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
      }

      removeEventListener(event: string, callback: Function) {
        const listeners = this.listeners.get(event);
        if (listeners) {
          listeners.delete(callback);
        }
      }
    }

    // Initialize GATT on mock devices
    mockDevices.forEach(device => {
      device.gatt = new MockGATTServer(device) as any;
    });

    // Mock navigator.bluetooth
    (window.navigator as any).bluetooth = {
      async requestDevice(options?: any) {
        // Simulate device selection delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Return mock Muse device
        return mockDevices[0];
      },

      async getDevices() {
        return mockDevices;
      },

      async getAvailability() {
        return true;
      },

      addEventListener(event: string, callback: Function) {
        // Mock event listener
      },

      removeEventListener(event: string, callback: Function) {
        // Mock event listener removal
      },
    };

    // Expose mock for testing purposes
    (window as any).__mockBluetooth = {
      devices: mockDevices,
      triggerDeviceDisconnect: () => {
        mockDevices.forEach(device => {
          if (device.gatt) {
            device.gatt.connected = false;
          }
        });
      },
      updateEEGData: (channelData: number[][]) => {
        // Allow tests to inject specific EEG patterns
        (window as any).__mockEEGData = channelData;
      },
    };
  });
}

/**
 * Wait for Bluetooth connection to be established
 */
export async function waitForBluetoothConnection(page: any, timeout = 10000) {
  return page.waitForFunction(
    () => {
      const devices = (window as any).__mockBluetooth?.devices || [];
      return devices.some((d: any) => d.gatt?.connected);
    },
    { timeout }
  );
}

/**
 * Simulate device disconnection
 */
export async function disconnectMockDevice(page: any) {
  await page.evaluate(() => {
    (window as any).__mockBluetooth?.triggerDeviceDisconnect();
  });
}

/**
 * Inject specific EEG pattern for testing
 */
export async function injectEEGPattern(
  page: any,
  pattern: 'baseline' | 'focused' | 'relaxed' | 'flow'
) {
  const patterns = {
    baseline: generateBaselinePattern(),
    focused: generateFocusedPattern(),
    relaxed: generateRelaxedPattern(),
    flow: generateFlowPattern(),
  };

  await page.evaluate((data) => {
    (window as any).__mockBluetooth?.updateEEGData(data);
  }, patterns[pattern]);
}

// EEG pattern generators
function generateBaselinePattern(): number[][] {
  // 4 channels × 60 samples (simulate 4 seconds at 250Hz)
  return Array(4).fill(0).map(() =>
    Array(60).fill(0).map(() => Math.random() * 2 - 1)
  );
}

function generateFocusedPattern(): number[][] {
  // Elevated beta waves, reduced alpha
  return Array(4).fill(0).map(() =>
    Array(60).fill(0).map((_, i) =>
      Math.sin(i * 0.3) * 1.5 + Math.random() * 0.3
    )
  );
}

function generateRelaxedPattern(): number[][] {
  // Elevated alpha waves, reduced beta
  return Array(4).fill(0).map(() =>
    Array(60).fill(0).map((_, i) =>
      Math.sin(i * 0.15) * 1.2 + Math.random() * 0.2
    )
  );
}

function generateFlowPattern(): number[][] {
  // Balanced theta/alpha ratio with moderate frontal asymmetry
  return Array(4).fill(0).map((_, channel) =>
    Array(60).fill(0).map((_, i) => {
      const theta = Math.sin(i * 0.1) * 0.8;
      const alpha = Math.sin(i * 0.15) * 0.6;
      const asymmetry = channel < 2 ? 0.2 : -0.2; // Left vs right hemisphere
      return theta + alpha + asymmetry + Math.random() * 0.1;
    })
  );
}
