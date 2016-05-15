var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define("ILocalStorageEvent", ["require", "exports"], function (require, exports) {
    'use strict';
});
define("INotifyOptions", ["require", "exports"], function (require, exports) {
    'use strict';
});
define("ILocalStorageServiceConfig", ["require", "exports"], function (require, exports) {
    'use strict';
});
define("LocalStorageServiceConfig", ["require", "exports", '@angular/core'], function (require, exports, core_1) {
    'use strict';
    var LOCAL_STORAGE_SERVICE_CONFIG_TOKEN = 'LOCAL_STORAGE_SERVICE_CONFIG';
    exports.LOCAL_STORAGE_SERVICE_CONFIG = new core_1.OpaqueToken(LOCAL_STORAGE_SERVICE_CONFIG_TOKEN);
});
define("LocalStorageService", ["require", "exports", '@angular/core', 'rxjs/Rx', "LocalStorageServiceConfig"], function (require, exports, core_2, Rx_1, LocalStorageServiceConfig_1) {
    'use strict';
    // Constants:
    var DEPRECATED = 'This function is deprecated.';
    var LOCAL_STORAGE_NOT_SUPPORTED = 'LOCAL_STORAGE_NOT_SUPPORTED';
    var LocalStorageService = (function () {
        function LocalStorageService(config) {
            var _this = this;
            this.isSupported = false;
            this.notifyOptions = {
                setItem: false,
                removeItem: false
            };
            this.prefix = 'ls';
            this.storageType = 'localStorage';
            var notifyOptions = config.notifyOptions, prefix = config.prefix, storageType = config.storageType;
            if (notifyOptions != null) {
                var setItem = notifyOptions.setItem, removeItem = notifyOptions.removeItem;
                this.setNotify(setItem, removeItem);
            }
            if (prefix != null) {
                this.setPrefix(prefix);
            }
            if (storageType != null) {
                this.setStorageType(storageType);
            }
            this.errors$ = new Rx_1.Observable(function (observer) { return _this.errors = observer; }).share();
            this.removeItems$ = new Rx_1.Observable(function (observer) { return _this.removeItems = observer; }).share();
            this.setItems$ = new Rx_1.Observable(function (observer) { return _this.setItems = observer; }).share();
            this.warnings$ = new Rx_1.Observable(function (observer) { return _this.warnings = observer; }).share();
            this.isSupported = this.checkSupport();
        }
        LocalStorageService.prototype.add = function (key, value) {
            if (console && console.warn) {
                console.warn(DEPRECATED);
                console.warn('Use `LocalStorageService.set` instead.');
            }
            return this.set(key, value);
        };
        LocalStorageService.prototype.clearAll = function (regularExpression) {
            // Setting both regular expressions independently
            // Empty strings result in catchall RegExp
            var prefixRegex = !!this.prefix ? new RegExp('^' + this.prefix) : new RegExp('');
            var testRegex = !!regularExpression ? new RegExp(regularExpression) : new RegExp('');
            if (!this.isSupported) {
                this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
                return false;
            }
            var prefixLength = this.prefix.length;
            for (var key in this.webStorage) {
                // Only remove items that are for this app and match the regular expression
                if (prefixRegex.test(key) && testRegex.test(key.substr(prefixLength))) {
                    try {
                        this.remove(key.substr(prefixLength));
                    }
                    catch (e) {
                        this.errors.next(e.message);
                        return false;
                    }
                }
            }
            return true;
        };
        LocalStorageService.prototype.deriveKey = function (key) {
            return "" + this.prefix + key;
        };
        LocalStorageService.prototype.get = function (key) {
            if (!this.isSupported) {
                this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
                return false;
            }
            var item = this.webStorage ? this.webStorage.getItem(this.deriveKey(key)) : null;
            // FIXME: not a perfect solution, since a valid 'null' string can't be stored
            if (!item || item === 'null') {
                return null;
            }
            try {
                return JSON.parse(item);
            }
            catch (e) {
                return item;
            }
        };
        LocalStorageService.prototype.getStorageType = function () {
            return this.storageType;
        };
        LocalStorageService.prototype.keys = function () {
            if (!this.isSupported) {
                this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
                return [];
            }
            var prefixLength = this.prefix.length;
            var keys = [];
            for (var key in this.webStorage) {
                // Only return keys that are for this app
                if (key.substr(0, prefixLength) === this.prefix) {
                    try {
                        keys.push(key.substr(prefixLength));
                    }
                    catch (e) {
                        this.errors.next(e.message);
                        return [];
                    }
                }
            }
            return keys;
        };
        LocalStorageService.prototype.length = function () {
            var count = 0;
            var storage = this.webStorage;
            for (var i = 0; i < storage.length; i++) {
                if (storage.key(i).indexOf(this.prefix) === 0) {
                    count += 1;
                }
            }
            return count;
        };
        LocalStorageService.prototype.remove = function () {
            var _this = this;
            var keys = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                keys[_i - 0] = arguments[_i];
            }
            var result = true;
            keys.forEach(function (key) {
                if (!_this.isSupported) {
                    _this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
                    result = false;
                }
                try {
                    _this.webStorage.removeItem(_this.deriveKey(key));
                    if (_this.notifyOptions.removeItem) {
                        _this.removeItems.next({
                            key: key,
                            storageType: _this.storageType
                        });
                    }
                }
                catch (e) {
                    _this.errors.next(e.message);
                    result = false;
                }
            });
            return result;
        };
        LocalStorageService.prototype.set = function (key, value) {
            // Let's convert `undefined` values to `null` to get the value consistent
            if (value === undefined) {
                value = null;
            }
            else {
                value = JSON.stringify(value);
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
            }
            catch (e) {
                this.errors.next(e.message);
                return false;
            }
            return true;
        };
        LocalStorageService.prototype.checkSupport = function () {
            try {
                var supported = this.storageType in window
                    && window[this.storageType] !== null;
                if (supported) {
                    this.webStorage = window[this.storageType];
                    // When Safari (OS X or iOS) is in private browsing mode, it
                    // appears as though localStorage is available, but trying to
                    // call .setItem throws an exception.
                    //
                    // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made
                    // to add something to storage that exceeded the quota."
                    var key = this.deriveKey("__" + Math.round(Math.random() * 1e7));
                    this.webStorage.setItem(key, '');
                    this.webStorage.removeItem(key);
                }
                return supported;
            }
            catch (e) {
                this.errors.next(e.message);
                return false;
            }
        };
        LocalStorageService.prototype.setPrefix = function (prefix) {
            this.prefix = prefix;
            // If there is a prefix set in the config let's use that with an appended
            // period for readability:
            var PERIOD = '.';
            if (this.prefix && this.prefix.endsWith(PERIOD)) {
                this.prefix = !!this.prefix ? "" + this.prefix + PERIOD : '';
            }
        };
        LocalStorageService.prototype.setStorageType = function (storageType) {
            this.storageType = storageType;
        };
        LocalStorageService.prototype.setNotify = function (setItem, removeItem) {
            if (setItem != null) {
                this.notifyOptions.setItem = setItem;
            }
            if (removeItem != null) {
                this.notifyOptions.removeItem = removeItem;
            }
        };
        LocalStorageService = __decorate([
            __param(0, core_2.Inject(LocalStorageServiceConfig_1.LOCAL_STORAGE_SERVICE_CONFIG)), 
            __metadata('design:paramtypes', [Object])
        ], LocalStorageService);
        return LocalStorageService;
    }());
    exports.LocalStorageService = LocalStorageService;
});
define("angular-2-local-storage", ["require", "exports", "LocalStorageService", "LocalStorageServiceConfig"], function (require, exports, LocalStorageService_1, LocalStorageServiceConfig_2) {
    'use strict';
    exports.LocalStorageService = LocalStorageService_1.LocalStorageService;
    exports.LOCAL_STORAGE_SERVICE_CONFIG = LocalStorageServiceConfig_2.LOCAL_STORAGE_SERVICE_CONFIG;
});
//# sourceMappingURL=angular-2-local-storage.js.map