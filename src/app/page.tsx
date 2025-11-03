import Link from 'next/link';
import {
  Brain,
  Waves,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:px-8 lg:px-12 lg:pt-32 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-7xl">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Zap className="h-4 w-4" />
              <span>Science-Backed Neurofeedback</span>
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Enter Your{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Flow State
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Real-time EEG neurofeedback to help you achieve peak mental
              performance. Train your brain to enter and maintain flow states
              on demand.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/session"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                Start Session
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/calibration"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-8 py-4 text-lg font-semibold text-foreground transition-all hover:bg-accent"
              >
                <Settings className="h-5 w-5" />
                Calibrate Device
              </Link>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -left-4 top-20 h-72 w-72 animate-pulse-slow rounded-full bg-primary/10 blur-3xl lg:-left-20 lg:top-10" />
          <div className="absolute -right-4 bottom-20 h-72 w-72 animate-pulse-slow rounded-full bg-accent/10 blur-3xl lg:-right-20 lg:bottom-10" />
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              Key Features
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Everything you need to optimize your mental performance
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Brain className="h-8 w-8" />}
              title="Real-Time Monitoring"
              description="Live EEG data processing with millisecond precision for immediate feedback"
            />
            <FeatureCard
              icon={<Waves className="h-8 w-8" />}
              title="Flow Detection"
              description="Advanced algorithms identify flow states based on brainwave patterns"
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8" />}
              title="Progress Tracking"
              description="Detailed analytics showing your improvement over time"
            />
            <FeatureCard
              icon={<Target className="h-8 w-8" />}
              title="Personalized Training"
              description="Adaptive feedback calibrated to your unique brain patterns"
            />
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className="px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-card p-8 lg:p-12">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
                  <Activity className="h-4 w-4" />
                  <span>Research-Backed</span>
                </div>

                <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl">
                  Grounded in Neuroscience
                </h2>

                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Flow states are characterized by specific brainwave patterns
                    that can be measured and enhanced through neurofeedback
                    training.
                  </p>

                  <p>
                    Research by Katahira et al. (2018) demonstrated that
                    real-time EEG neurofeedback can effectively modulate brain
                    activity and improve cognitive performance.
                  </p>

                  <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                    <strong className="text-foreground">
                      Scientific Foundation:
                    </strong>{' '}
                    Our approach combines theta/alpha ratio monitoring with
                    frontal asymmetry patterns to detect and reinforce flow
                    states based on peer-reviewed research.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-background p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      1
                    </div>
                    Theta/Alpha Ratio
                  </h3>
                  <p className="text-muted-foreground">
                    Increased theta (4-8 Hz) with decreased alpha (8-12 Hz)
                    indicates flow states
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      2
                    </div>
                    Frontal Asymmetry
                  </h3>
                  <p className="text-muted-foreground">
                    Left prefrontal activation correlates with approach
                    motivation and engagement
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      3
                    </div>
                    Gamma Enhancement
                  </h3>
                  <p className="text-muted-foreground">
                    Increased gamma activity (30-100 Hz) associated with peak
                    cognitive performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              A simple three-step process to optimize your brain performance
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <ProcessStep
              number="01"
              title="EEG Data Collection"
              description="Your EEG device captures brainwave activity in real-time with high temporal resolution"
              icon={<Brain className="h-6 w-6" />}
            />

            <ProcessStep
              number="02"
              title="Flow State Detection"
              description="Our algorithms analyze your brainwave patterns to identify flow characteristics"
              icon={<Activity className="h-6 w-6" />}
            />

            <ProcessStep
              number="03"
              title="Real-Time Feedback"
              description="Visual and auditory cues guide you toward maintaining optimal brain states"
              icon={<Zap className="h-6 w-6" />}
            />
          </div>

          <div className="mt-12 text-center">
            <p className="mb-6 text-muted-foreground">
              Ready to optimize your mental performance?
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/session"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:scale-105"
              >
                Start Your First Session
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground transition-all hover:bg-accent"
              >
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Flow
              </h3>
              <p className="text-sm text-muted-foreground">
                Science-backed neurofeedback for peak mental performance
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Navigation
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/session" className="hover:text-foreground">
                    Start Session
                  </Link>
                </li>
                <li>
                  <Link href="/calibration" className="hover:text-foreground">
                    Calibration
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="hover:text-foreground">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Research
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Reference
              </h4>
              <p className="text-xs text-muted-foreground">
                Katahira, K., et al. (2018). EEG Correlates of the Flow State: A
                Combination of Increased Frontal Theta and Moderate Frontocentral
                Alpha Rhythm in the Mental Arithmetic Task. Frontiers in Psychology.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Flow. For research and educational purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground shadow-lg">
          {number}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <h3 className="mb-3 text-2xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>

      {/* Connector line for desktop */}
      {number !== '03' && (
        <div className="absolute right-0 top-8 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/50 to-transparent lg:block" />
      )}
    </div>
  );
}
