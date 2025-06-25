export class Cabidela {
  constructor(
    public schema: any,
    public options?: any
  ) {}

  validate(data: any): any {
    // Simple mock validation that checks required properties
    if (this.schema.required) {
      for (const requiredProp of this.schema.required) {
        if (!(requiredProp in data)) {
          throw new Error(`Missing required property: ${requiredProp}`);
        }
      }
    }

    // Check if provided properties are in the schema
    if (this.schema.properties) {
      for (const prop in data) {
        if (!(prop in this.schema.properties)) {
          throw new Error(`Unknown property: ${prop}`);
        }
      }
    }

    return true;
  }
}
