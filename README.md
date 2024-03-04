# node-object-sync
This module is a small drop-in utility for automatically and transparently synchronizing
the contents of on-disk configuration files with the in-memory state.

## Documentation
- [Basic setup](#basic-setup)
- [API](#api)
- [Configuration options](#configuration-options)
    - [`fileLocation`](#filelocation)
    - [`defaultContent`](#defaultContent)
    - [`recursive`](#recursive)
    - [`save`](#save)
    - [`format`](#format)

## Basic setup
The main functionality of this utility is simple - It lets you wrap an existing object. You can interact with that object through the "wrapper" completely transparently. Each time a property is added, reassigned or deleted, the state of your object will be written to the disk.

```typescript

const myConfig = {
    logLevel: "info",
    useTimestamps: true,
    maxLogFileSize: "20MB",
    ...
}

const myWrappedConfig = SyncedObject.create({
    // The object that's being wrapped:
    defaultContent: myConfig,
    // Location of the file where the data is being saved to:
    fileLocation: "/Users/user/Library/Preferences/my-app/my-config.json"
})

// Modify "logLevel"
myWrappedConfig.logLevel = "debug"
// After the property is reassigned, the changes are immediately saved to the disk.

```

## API
### There is no API!  
You can interact with your object directly like you have done to this time and the `SyncedObject` instance will act as a middleman, monitoring your changes and writing them to the configuration file for you.

## Configuration options

- ###### `defaultContent` 
    Type: `<Object>`

    Defines the default content of the configuration file that is written to it if the file doesn't already exist.

- ###### `fileLocation` 
    Type: `<string>`

    Defines the location where wrapped object is stored.  
    If the file already exists in the specified location then all of it's data will be loaded.  
    If not, a new file will be created and the content of `defaultContent` will be written to it.

- ###### `recursive`
    Type: `<boolean>`  
    Default: `false`

    Analogue to a recursive `fs.mkDir`.  
    Defines whether or not to create the file's parent directory recursively.
    
- ###### `save`
    Type: `<"sync" | "async" | number>`  
    Default: `"sync"`

    Defines the behavior of synchronizing the configuration file's content with the in-memory state.
    
    - `<"sync">` - Overwrites the configuration file immediately after any object modifications.
    This behavior is using `fs.writeFileSync` under the hood and is blocking!  
    **Note:** Any write, permission or filesystem errors will be thrown on assign and delete actions!

    - `<"async">` - Overwrites the configuration file immediately after any object modifications, but with use of the asynchronous `fs` API.   
    **Note:** Any errors thrown during the file save are silenced to prevent application crashes.

    - `<number>` - Overwrites the configuration file after a specified timeout, asynchronously.
    This saving method is a "lazy" method and is best suited for when the target object is expected to receive lots of writes.  
    If set to `1s`, and two writes were received `300ms` apart, the file would be overwritten exactly `1s` after the most recent write, so in this case after `1.3s`. If any writes are made within `1s` of the last one, the timeout is simply moved a second later, until the frequency is lower.

- ###### `format`
    Type: `<{ parse: Function, stringify: Function }>`  
    Default: `JSON.parse & JSON.stringify`

    Defines the parse and stringify methods used to read/write from/to the file.
    By default the `JSON` format is used, but these can be used to set any arbitrary configuration format, such as Yaml, XML, PKL, INI or any other.


 
    