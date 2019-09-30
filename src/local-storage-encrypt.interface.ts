export interface ILocalStorageEncrypt {
    type: typeValue;
    value: any;
}

export enum typeValue {
    string = 'string',
    boolean = 'boolean',
    number = 'number',
    object = 'object'
}