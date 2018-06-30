'use babel';

/**
 * This file gets the activity for the client to send to Discord.
 */

import { Emitter } from 'atom';
import AtomDiscordPresence from './atom-discord-presence';
import Icons from './icons';

export default class {

    constructor() {
        this.emitter = new Emitter();

        this.projectName = null;
        this.fileName = null;
        this.startTimestamp = Date.now() / 1000;
    }

    getProjectName() {
        return this.projectName;
    }

    setProjectName(name) {
        if (this.projectName === name) return;
        this.projectName = name;
        this.emitter.emit('did-change-project-name', name);
        this.emitter.emit('did-activity-update');
    }

    onDidChangeProjectName(callback) {
        return this.emitter.on('did-change-project-name', callback);
    }

    observeProjectName(callback) {
        return callback(this.projectName), this.onDidChangeProjectName(callback);
    }

    getFileName() {
        return this.fileName;
    }

    setFileName(name) {
        if (this.fileName === name) return;
        this.fileName = name;
        this.emitter.emit('did-change-file-name', name);
        this.emitter.emit('did-activity-update');
    }

    onDidChangeFileName(callback) {
        return this.emitter.on('did-change-file-name', callback);
    }

    observeFileName(callback) {
        return callback(this.fileName), this.onDidChangeFileName(callback);
    }

    getStartTimestamp() {
        return this.startTimestamp;
    }

    setStartTimestamp(startTimestamp) {
        if (this.startTimestamp === startTimestamp) return;
        this.startTimestamp = startTimestamp;
        this.emitter.emit('did-change-start-timestamp', startTimestamp);
        this.emitter.emit('did-activity-update');
    }

    resetStartTimestamp() {
        this.setStartTimestamp(Date.now() / 1000);
    }

    onDidChangeStartTimestamp(callback) {
        return this.emitter.on('did-change-start-timestamp', callback);
    }

    observeStartTimestamp(callback) {
        return callback(this.startTimestamp), this.onDidChangeStartTimestamp(callback);
    }

    onDidActivityUpdate(callback) {
        return this.emitter.on('did-activity-update', callback);
    }

    observeActivityUpdate(callback) {
        return callback(), this.onDidActivityUpdate(callback);
    }

    getActivity() {
        const data = {
            state: this.getState(),
            details: this.getDetails()
        };

        if (AtomDiscordPresence.behaviour.sendLargeImage) {
            const largeImage = this.getLargeImage();

            data.largeImageKey = largeImage.key;
            data.largeImageText = largeImage.text;
        }

        if (AtomDiscordPresence.behaviour.sendSmallImage) {
            const smallImage = this.getSmallImage();

            data.smallImageKey = smallImage.key;
            data.smallImageText = smallImage.text;
        }

        if (AtomDiscordPresence.privacy.sendElapsed) {
            data.startTimestamp = this.getStartTimestamp();
        }

        return data;
    }

    getState() {
        if (AtomDiscordPresence.privacy.sendProject && this.projectName) {
            return AtomDiscordPresence.getTranslation('working-project', {
                projectName: this.getProjectName()
            });
        }

        return AtomDiscordPresence.getTranslation('working-no-project');
    }

    getDetails() {
        if (AtomDiscordPresence.privacy.sendFilename) {
            if (this.getFileName()) {
                return AtomDiscordPresence.getTranslation('editing-file', {
                    fileName: this.getFileName()
                });
            }

            return AtomDiscordPresence.getTranslation('editing-idle');
        }

        return AtomDiscordPresence.getTranslation('type-unknown');
    }

    getLargeImage() {
        const icon = Icons.getIcon(this.getFileName());

        if (AtomDiscordPresence.privacy.sendFileType) {
            if (icon) {
                return {key: icon.icon, text: icon.text};
            }

            return {key: undefined, text: undefined};
        }

        return {key: 'text', text: AtomDiscordPresence.getTranslation('type-unknown')};
    }

    getSmallImage() {
        return {
            key: AtomDiscordPresence.behaviour.alternativeIcon,
            text: AtomDiscordPresence.getTranslation('atom-description')
        };
    }

}
