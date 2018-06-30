'use babel';

import { CompositeDisposable } from 'atom';
import AtomDiscordPresence from './atom-discord-presence';

class PopoverView {
    constructor() {
        this.subscriptions = new CompositeDisposable();

        this.element = document.createElement('div');

        // Create Discord logo element
        const logo = document.createElement('img');
        logo.src = 'https://discordapp.com/assets/4f004ac9be168ac6ee18fc442a52ab53.svg';
        logo.classList.add('discord-logo');
        this.element.appendChild(logo);

        // Create status element
        this.statusView = new StatusView();
        this.element.appendChild(this.statusView.getElement());

        // Create project name element
        const projectNameElement = document.createElement('div');
        projectNameElement.classList.add('projectname');
        this.element.appendChild(projectNameElement);
        this.subscriptions.add(AtomDiscordPresence.activity.observeProjectName(projectName => projectNameElement.textContent = projectName));

        // Create file name element
        const fileNameElement = document.createElement('div');
        fileNameElement.classList.add('filename');
        this.element.appendChild(fileNameElement);
        this.subscriptions.add(AtomDiscordPresence.activity.observeFileName(fileName => fileNameElement.textContent = fileName));

        // Create Teletype token element
        const teletypeTokenElement = document.createElement('div');
        teletypeTokenElement.classList.add('teletype-token');
        this.element.appendChild(teletypeTokenElement);
        this.subscriptions.add(AtomDiscordPresence.activity.observeJoinSecret(joinSecret => teletypeTokenElement.textContent = joinSecret));
    }

    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
        this.statusView.destroy();
    }

    getElement() {
        return this.element;
    }
}

class StatusView {
    constructor() {
        this.subscriptions = new CompositeDisposable();

        this.element = document.createElement('div');
        this.element.classList.add('status');

        // Create status text element
        const statusText = document.createElement('div');
        this.element.appendChild(statusText);

        const buttonGroup = document.createElement('div');
        buttonGroup.classList.add('btn-group');
        this.element.appendChild(buttonGroup);

        // Create reconnect button element
        const reconnectButton = document.createElement('button');
        reconnectButton.classList.add('btn');
        reconnectButton.textContent = 'Connect';
        reconnectButton.addEventListener('click', () => AtomDiscordPresence.tryConnect());

        // Create disconnect button element
        const disconnectButton = document.createElement('button');
        disconnectButton.classList.add('btn');
        disconnectButton.textContent = 'Disconnect';
        disconnectButton.addEventListener('click', () => AtomDiscordPresence.client.destroy());

        // Create force update button element
        const forceUpdateButton = document.createElement('button');
        forceUpdateButton.classList.add('btn');
        forceUpdateButton.textContent = 'Update';
        forceUpdateButton.addEventListener('click', () => AtomDiscordPresence.client.sendActivity());

        // Create reset timestamp button element
        const resetTimestampButton = document.createElement('button');
        resetTimestampButton.classList.add('btn');
        resetTimestampButton.textContent = 'Reset timestamp';
        resetTimestampButton.addEventListener('click', () => AtomDiscordPresence.activity.resetStartTimestamp());
        buttonGroup.appendChild(resetTimestampButton);

        this.subscriptions.add(AtomDiscordPresence.client.observeStatus(status => {
            statusText.textContent = status.connected ? 'Connected' : 'Not connected';

            try {
                buttonGroup[status.connected ? 'insertBefore' : 'removeChild'](forceUpdateButton, buttonGroup.firstChild);
            } catch (err) {}
            try {
                buttonGroup[status.connected ? 'insertBefore' : 'removeChild'](disconnectButton, buttonGroup.firstChild);
            } catch (err) {}
            try {
                buttonGroup[!status.connected ? 'insertBefore' : 'removeChild'](reconnectButton, buttonGroup.firstChild);
            } catch (err) {}
        }));
    }

    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
    }

    getElement() {
        return this.element;
    }
}

export default class StatusBarView {

    constructor(serializedState) {
        this.subscriptions = new CompositeDisposable();

        // Create root element
        this.element = document.createElement('div');
        this.element.classList.add('atom-discord-presence', 'inline-block');

        this.popover = new PopoverView();
        this.subscriptions.add(atom.tooltips.add(this.element, {
            item: this.popover.getElement(),
            class: 'atom-discord-presence-popover',
            trigger: 'click'
        }));

        // /assets/1c8a54f25d101bdc607cec7228247a9a.svg
        const icon = document.createElement('div');
        icon.classList.add('discord-icon', 'inline-block');
        this.element.appendChild(icon);

        // Create message element
        const label = document.createElement('div');
        label.classList.add('discord-label', 'inline-block');
        label.textContent = 'Discord';
        this.element.appendChild(label);
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {}

    // Tear down any state and detach
    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
        this.popover.destroy();
    }

    getElement() {
        return this.element;
    }

}
