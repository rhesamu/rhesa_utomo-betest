export interface ReadinessCheck {
  name: string;
  check: () => Promise<boolean>;
}
