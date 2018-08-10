'use babel';

import { Emitter } from 'atom';
import { Client } from 'discord-rpc';
import AtomDiscordPresence from './atom-discord-presence';

class Loop {
    constructor() {
        this.functions = [];
        this._stop = [];
    }

    add(callback, bind) {
        const loopFunction = {callback, bind};
        this.functions.push(loopFunction);
        return loopFunction;
    }

    async run() {
        if (this.active) await this.stop();
        this.active = true;

        return this.promise = (async () => {
            let throwError = false, error;

            while (!this._stop.length) {
                for (let loopFunction of this.functions) {
                    try {
                        await loopFunction.callback.call(loopFunction.bind || loopFunction, this);
                    } catch (err) {
                        this._stop.push(() => {});
                        console.error('Error thrown in loop function', loopFunction, err);
                        throwError = true;
                        error = err;
                    }
                }

                // Allow Node.js' event loop to continue
                await Loop.wait();
            }

            for (let stop of this._stop) stop();
            this._stop.splice(0, this._stop.length);
            this.active = false;
            this.promise = undefined;
            if (throwError) throw error;
        })();
    }

    stop() {
        return new Promise(resolve => this._stop.push(resolve));
    }

    async destroy() {
        await this.stop();
        this.functions.splice(0, this.functions.length);
    }

    static wait(seconds = 0) {
        return new Promise(resolve => setTimeout(resolve, seconds));
    }
}

export default class {

    constructor() {
        this.emitter = new Emitter();
        this.status = {
            connected: false
        };
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.rpc) return resolve();

            const rpc = new Client({ transport: 'ipc' });
            rpc.on('ready', () => {
                this.rpc = rpc;
                this.setStatus({connected: true});
                resolve();
            });
            rpc.transport.on('close', event => {
                if (event instanceof Error) this.emitter.emit('connection-error', event);
                this.destroyRpc();
            });
            rpc.login(AtomDiscordPresence.DISCORD_ID).catch(reject);
        });
    }

    destroy() {
        return Promise.all([this.destroyLoop(), this.destroyRpc()]);
    }

    async destroyLoop() {
        if (this._loop) {
            await this.loop.destroy();
            delete this._loop;
        }
    }

    async destroyRpc() {
        if (this.rpc) {
            const rpc = this.rpc;
            this.rpc = null;

            this.setStatus({connected: false});
            await rpc.clearActivity();
            await rpc.destroy();
        }
    }

    get loop() {
        if (this._loop) return this._loop;

        const loop = new Loop();
        loop.add(() => Loop.wait(AtomDiscordPresence.updateTick));
        loop.add(this.sendActivity, this);

        return this._loop;
    }

    async start() {
        await this.connect();
        this.loop.run();
        return this.loop;
    }

    async stop() {
        await this.loop.stop();
    }

    sendActivity() {
        if (!this.rpc) return;

        const data = AtomDiscordPresence.activity.getActivity();
        return this.rpc.setActivity(data);
    }

    clearActivity() {
        return this.rpc.clearActivity();
    }

    getStatus() {
        return this.status;
    }

    setStatus(status) {
        Object.assign(this.status, status);
        this.emitter.emit('did-status-update', this.status);
    }

    onDidStatusUpdate(callback) {
        return this.emitter.on('did-status-update', callback);
    }

    observeStatus(callback) {
        return callback(this.status), this.onDidStatusUpdate(callback);
    }

}
