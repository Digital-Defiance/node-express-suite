import { SuiteCoreStringKey, TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';

export type ServiceFactory<T = any> = () => T;

export class ServiceContainer {
  private services = new Map<string, ServiceFactory>();
  private instances = new Map<string, any>();
  private singletons = new Set<string>();

  register<T>(key: string, factory: ServiceFactory<T>, singleton = true): void {
    this.services.set(key, factory);
    if (singleton) {
      this.singletons.add(key);
    }
  }

  get<T>(key: string): T {
    if (this.singletons.has(key)) {
      if (!this.instances.has(key)) {
        const factory = this.services.get(key);
        if (!factory) throw new TranslatableSuiteError(SuiteCoreStringKey.Error_ServiceIsNotRegisteredTemplate, { key });
        this.instances.set(key, factory());
      }
      return this.instances.get(key);
    }

    const factory = this.services.get(key);
    if (!factory) throw new TranslatableSuiteError(SuiteCoreStringKey.Error_ServiceIsNotRegisteredTemplate, { key });
    return factory();
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  clear(): void {
    this.instances.clear();
  }
}
