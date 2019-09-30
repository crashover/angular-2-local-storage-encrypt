# angular-2-local-storage-encrypt

Based on [angular-2-local-storage](https://github.com/phenomnomnominal/angular-2-local-storage)
AoT compatible.

## Differences

* Save the values with AES128
## Install

`npm install crypto-js angular-2-local-storage-encrypt`

## Usage

You can optionally configure the module:

```typescript
import { LocalStorageModule } from 'angular-2-local-storage-encrypt';

@NgModule({
    imports: [
        LocalStorageModule.forRoot({
            prefix: 'my-app',
            storageType: 'localStorage',
            encryptionActive: true,
            encryptionOptions: {
                encryptionKey: 'keyForEncriptHere',
                encryptionIv: 'iVHere',
                encryptionSalt: 'saltHere'
            }
        })
    ],
    declarations: [
        ..
    ],
    providers: [
        ..
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
```

Then you can use it in a component:

```typescript
import { LocalStorageServiceEncrypt } from 'angular-2-local-storage-encrypt';

@Component({
    // ...
})
export class SomeComponent {
    constructor (
        private _localStorageService: LocalStorageService
    ) {
        // this._localStorageService.set('key', 'value');
        // this._localStorageService.get('key');
    }
}

```

### Configuration options
encryptionActive: boolean; true for save with AES128, false for text plain;
