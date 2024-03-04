
// imports ====================================================================

import fs, { promises as fsp } from 'fs'
import { FileHandle } from 'fs/promises'
import path from 'path'
import {createLazyTimer} from './timer.js'

// Types ======================================================================

type Parser      = (object: string) => any
type Stringifier = (data: any)      => string

interface ObjectFileSettings<ContentType> {
    /** 
     * Absolute path to the file where the configuration should be stored.  
     * ```js 
     * // Example:
     * "/Users/user/Library/Preferences/my-config.json"
     * path.join(process.env.HOME, "my-config.json")
     * // ...
     * ``` */
    fileLocation: string
    /**
     * The default content of the configuration file.  
     * If the configuration file doesn't exist in the specified location, a new one
     * will be created and populated with this information.
     */
    defaultContent: ContentType
    /**
     * Specifies whether or not to create the parent folder(s) where the configuration file should reside.
     * Similar to `fs.mkdir("/folder1/folder2/folder3/", { recursive: true })`
     * @default false
     */
    recursive?: boolean
    /**
     * Specifies the parse and stringify methods used for formatting.  
     * These methods can be used to implement different configuration file 
     * formats, like JSON, YAML, XML, or any other.
     * @default { parse: JSON.parse, stringify: JSON.stringify }
     */
    format?: {
        stringify: Stringifier,
        parse: Parser
    }
    /**
     * Determines the syncing behavior of the configuration file.  
     * - `sync` - Synchronously overwrites the configuration file each time any object property is changed.  
     * - `async` - Schedules an async overwrite of the configuration file each time any object property is changed.
     * This has a potential to lose the most recent changes in case of a sudden application crash, but is much faster.  
     * - `number` - Lazy mode. When set to a number (in milliseconds), file overwrites wait a set amount of time after the most
     * change. For example, if set to `1s` and recieved two writes `300ms` apart, an overwrite would happen after `1.6s`,
     * exactly 1 second after the most recent change.
     * 
     * **Note:** When in `async` and `lazy` mode, any file write errors will be silenced as to not cause crashes.
     * If the integrity if the file is of the most importance, you must do your own checks.
     * @default `sync`
     */
    save?: 'sync' | 'async' | number
}

// Implementation =============================================================

export default class ObjectFile<ContentType = any> {

    // Configuration
    private fileLocation: string
    private content: ContentType
    private recursive: boolean
    private stringify: Stringifier
    private parse: Parser
    private timerCall: Function

    private constructor(settings: ObjectFileSettings<ContentType>) {

        this.fileLocation   = settings.fileLocation
        this.content        = settings.defaultContent
        this.recursive      = settings.recursive || false
        this.parse          = settings.format ? settings.format.parse     : JSON.parse
        this.stringify      = settings.format ? settings.format.stringify : JSON.stringify
        this.timerCall       = createLazyTimer(typeof settings.save === 'number' ? settings.save : 1000, () => this.saveAsync())

        const exists = fs.existsSync(this.fileLocation)
        
        // Ensure parent dir
        if (this.recursive && !exists && !fs.existsSync(path.dirname(this.fileLocation))) 
            fs.mkdirSync(path.dirname(this.fileLocation))

        // Sync content
        if (exists) this.content = this.parse(fs.readFileSync(this.fileLocation, 'utf-8'))
        else fs.writeFileSync(this.fileLocation, this.stringify(this.content))

        // Set save method
        if (settings.save === 'async') this.save = this.saveAsync
        if (typeof settings.save === 'number') this.save = this.timerCall

    }

    static create<ContentType extends Object>(settings: ObjectFileSettings<ContentType>): ContentType {

        const self = new this(settings)

        // @ts-ignore - I don't have the nerve for this...
        return new Proxy(self.content, {
            get: Reflect.get,
            has: Reflect.has,
            ownKeys: Reflect.ownKeys,
            set(target, prop, value) {
                const wasSet = Reflect.set(target, prop, value)
                self.save()
                return wasSet
            },
            deleteProperty(target, prop) {
                const wasDeleted = Reflect.deleteProperty(target, prop)
                self.save()
                return wasDeleted
            },
        })

    }

    // Save method chosen at creation
    private save: Function = this.saveSync

    // Used for `sync` save behavior
    private saveSync() {
        const content = this.stringify(this.content)
        fs.writeFileSync(this.fileLocation, content, 'utf-8')
    }

    // Used for `async` save behavior
    private async saveAsync() {
        const content = this.stringify(this.content)
        try {
            await fsp.writeFile(this.fileLocation, content, 'utf-8')
        } 
        catch {}
    }

}