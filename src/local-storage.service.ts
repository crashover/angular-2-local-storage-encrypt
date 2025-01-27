import { Inject, Injectable, Optional } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { share } from 'rxjs/operators';
import { AesUtil } from './AesUtil';
import { ILocalStorageEvent } from './local-storage-events.interface';
import { ILocalStorageEncrypt, typeValue } from './local-storage-encrypt.interface';
import { INotifyOptions } from './notify-options.interface';
import { ILocalStorageServiceConfig, IEncryptionOptions, LOCAL_STORAGE_SERVICE_CONFIG } from './local-storage.config.interface';
import { type } from 'os';

const DEPRECATED: string = 'This function is deprecated.';
const LOCAL_STORAGE_NOT_SUPPORTED: string = 'LOCAL_STORAGE_NOT_SUPPORTED';

@Injectable({
    providedIn: 'root'
})
export class LocalStorageServiceEncrypt {
    public isSupported: boolean = false;

    public errors$: Observable<string>;
    public removeItems$: Observable<ILocalStorageEvent>;
    public setItems$: Observable<ILocalStorageEvent>;
    public warnings$: Observable<string>;

    private notifyOptions: INotifyOptions = {
        setItem: false,
        removeItem: false
    };
    private prefix: string = 'ls';
    private storageType: 'sessionStorage' | 'localStorage' = 'localStorage';
    private encryptionActive: boolean = true;
    private encryptionOptions: IEncryptionOptions;
    private webStorage: Storage;

    private errors: Subscriber<string> = new Subscriber<string>();
    private removeItems: Subscriber<ILocalStorageEvent> = new Subscriber<ILocalStorageEvent>() ;
    private setItems: Subscriber<ILocalStorageEvent> = new Subscriber<ILocalStorageEvent>();
    private warnings: Subscriber<string> = new Subscriber<string>();

    constructor (
        @Optional() @Inject(LOCAL_STORAGE_SERVICE_CONFIG) config: ILocalStorageServiceConfig = {}
    ) {
        let { notifyOptions, prefix, storageType, encryptionActive, encryptionOptions } = config;

        if (notifyOptions != null) {
            let { setItem, removeItem } = notifyOptions;
            this.setNotify(!!setItem, !!removeItem);
        }
        if (prefix != null) {
            this.setPrefix(prefix);
        }
        if (storageType != null) {
            this.setStorageType(storageType);
        }

        if(encryptionActive != null) {
            this.setEncryptionActive(encryptionActive);
        }

        if(encryptionOptions != null) {
            this.setEncryptionOptions(encryptionOptions);
        }

        this.errors$ = new Observable<string>((observer: Subscriber<string>) => this.errors = observer).pipe(share());
        this.removeItems$ = new Observable<ILocalStorageEvent>((observer: Subscriber<ILocalStorageEvent>) => this.removeItems = observer).pipe(share());
        this.setItems$ = new Observable<ILocalStorageEvent>((observer: Subscriber<ILocalStorageEvent>) => this.setItems = observer).pipe(share());
        this.warnings$ = new Observable<string>((observer: Subscriber<string>) => this.warnings = observer).pipe(share());

        this.isSupported = this.checkSupport();
    }

    public add (key: string, value: any): boolean {
        if (console && console.warn) {
            console.warn(DEPRECATED);
            console.warn('Use `LocalStorageService.set` instead.');
        }

        return this.set(key, value);
    }

    public clearAll (regularExpression?: string): boolean {
        // Setting both regular expressions independently
        // Empty strings result in catchall RegExp
        let prefixRegex = !!this.prefix ? new RegExp('^' + this.prefix) : new RegExp('');
        let testRegex = !!regularExpression ? new RegExp(regularExpression) : new RegExp('');

        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return false;
        }

        let prefixLength = this.prefix.length;

        for (let key in this.webStorage) {
            // Only remove items that are for this app and match the regular expression
            if (prefixRegex.test(key) && testRegex.test(key.substr(prefixLength))) {
                try {
                    this.remove(key.substr(prefixLength));
                } catch (e) {
                    this.errors.next(e.message);
                    return false;
                }
            }
        }
        return true;
    }

    public deriveKey (key: string): string {
        return `${this.prefix}${key}`;
    }

    public get <T> (key: string): T {
        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return null;
        }

        let item = this.webStorage ? this.webStorage.getItem(this.deriveKey(key)) : null;
        // FIXME: not a perfect solution, since a valid 'null' string can't be stored
        if (!item || item === 'null') {
            return null;
        }

        try {
            if(this.encryptionActive) {
                return this.decrypt(item);
            }
            return JSON.parse(item);
        } catch (e) {
            return null;
        }
    }

    public getStorageType (): string {
        return this.storageType;
    }

    public getEncryptionActive (): boolean {
        return this.encryptionActive;
    }

    public getEncryptionOptions (): IEncryptionOptions {
        return this.encryptionOptions;
    }

    public keys (): Array<string> {
        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return [];
        }

        let prefixLength = this.prefix.length;
        let keys: Array<string> = [];
        for (let key in this.webStorage) {
            // Only return keys that are for this app
            if (key.substr(0, prefixLength) === this.prefix) {
                try {
                    keys.push(key.substr(prefixLength));
                } catch (e) {
                    this.errors.next(e.message);
                    return [];
                }
            }
        }
        return keys;
    }

    public length (): number {
        let count = 0;
        let storage = this.webStorage;
        for(let i = 0; i < storage.length; i++) {
            if (storage.key(i).indexOf(this.prefix) === 0) {
                count += 1;
            }
        }
        return count;
    }

    public remove (...keys: Array<string>): boolean {
        let result = true;
        keys.forEach((key: string) => {
            if (!this.isSupported) {
                this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
                result = false;
            }

            try {
                this.webStorage.removeItem(this.deriveKey(key));
                if (this.notifyOptions.removeItem) {
                    this.removeItems.next({
                        key: key,
                        storageType: this.storageType
                    });
                }
            } catch (e) {
                this.errors.next(e.message);
                result = false;
            }
        });
        return result;
    }

    public set (key: string, value: any): boolean {
        // Let's convert `undefined` values to `null` to get the value consistent
        if (value === undefined) {
            value = null;
        } else {
            if (this.encryptionActive) {
                value = this.encrypt(value);
            } else {
                value = JSON.stringify(value);
            }
        }

        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return false;
        }

        try {
            if (this.webStorage) {
                this.webStorage.setItem(this.deriveKey(key), value);
            }
            if (this.notifyOptions.setItem) {
                this.setItems.next({
                    key: key,
                    newvalue: value,
                    storageType: this.storageType
                });
            }
        } catch (e) {
            this.errors.next(e.message);
            return false;
        }
        return true;
    }

    private checkSupport (): boolean {
        try {
            let supported = this.storageType in window
                          && window[this.storageType] !== null;

            if (supported) {
                this.webStorage = window[this.storageType];

                // When Safari (OS X or iOS) is in private browsing mode, it
                // appears as though localStorage is available, but trying to
                // call .setItem throws an exception.
                //
                // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made
                // to add something to storage that exceeded the quota."
                let key = this.deriveKey(`__${Math.round(Math.random() * 1e7)}`);
                this.webStorage.setItem(key, '');
                this.webStorage.removeItem(key);
            }

            return supported;
        } catch (e) {
            this.errors.next(e.message);
            return false;
        }
    }

    private setPrefix (prefix: string): void {
        this.prefix = prefix;

        // If there is a prefix set in the config let's use that with an appended
        // period for readability:
        const PERIOD: string = '.';
        if (this.prefix && !this.prefix.endsWith(PERIOD)) {
            this.prefix = !!this.prefix ? `${this.prefix}${PERIOD}` : '';
        }
    }

    private setStorageType (storageType: 'sessionStorage' | 'localStorage'): void {
        this.storageType = storageType;
    }

    private setNotify (setItem: boolean, removeItem: boolean): void {
        if (setItem != null) {
            this.notifyOptions.setItem = setItem;
        }
        if (removeItem != null) {
            this.notifyOptions.removeItem = removeItem;
        }
    }

    private setEncryptionActive(encryptionActive: boolean): void {
        this.encryptionActive = encryptionActive;
    }

    private setEncryptionOptions(encryptionOptions: IEncryptionOptions): void {
        this.encryptionOptions = encryptionOptions;
    }

    private encrypt(textToEncrypt: any): string  {
        if (this.getEncryptionOptions) {
            const aesUtil = new AesUtil(128, 1000);
            let objectToEncrypt: ILocalStorageEncrypt;
            let valueEncrypt;
            if (typeof textToEncrypt === 'object') {
                objectToEncrypt = {
                    type: typeValue.object,
                    value: JSON.stringify(textToEncrypt)
                };
            } else if (typeof textToEncrypt === 'boolean' ) {
                objectToEncrypt = {
                    type: typeValue.boolean,
                    value: String(textToEncrypt)
                };
            }else if (typeof textToEncrypt === 'number') {
                objectToEncrypt = {
                    type: typeValue.number,
                    value: String(textToEncrypt)
                };
            } else {
                objectToEncrypt = {
                    type: typeValue.string,
                    value: textToEncrypt
                };
            }
            valueEncrypt = JSON.stringify(objectToEncrypt);
            const textEncrypt = aesUtil.encrypt(this.encryptionOptions.encryptionSalt, this.encryptionOptions.encryptionIv, this.encryptionOptions.encryptionKey, valueEncrypt);
            return textEncrypt;
        }
        return textToEncrypt;
    }

    private decrypt <T> (textToDecrypt): T {
        const aesUtil = new AesUtil(128, 1000);
        let objectDecrypt: ILocalStorageEncrypt;
        let valueResult: any;
        try {
            let textDecrypt = aesUtil.decrypt(this.encryptionOptions.encryptionSalt, this.encryptionOptions.encryptionIv, this.encryptionOptions.encryptionKey, textToDecrypt);
            objectDecrypt = JSON.parse(textDecrypt);
        } catch {

        }
        switch (objectDecrypt.type) {
            case 'string':
                valueResult = objectDecrypt.value;
            break;
            case 'number':
                valueResult = Number(objectDecrypt.value);
            break;
            case 'object':
                valueResult = JSON.parse(objectDecrypt.value);
            break;
            case 'boolean':
                if (objectDecrypt.value === 'false') {
                    valueResult = Boolean(false);
                } else if (objectDecrypt.value === 'true') {
                    valueResult = Boolean(true);
                }
            break;
        }
        return valueResult;
    }
}
