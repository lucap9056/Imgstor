/**
 * Message Button Event Definitions
 */
import BaseEventSystem from "structs/eventSystem";

interface MessageButtonOptions {
    auto_remove?: boolean
}

type MessageButtonEventDefinitions = {
    "Clicked": { detail: Message };
    "ErrorOccurred": { detail: { message: string, error: Error } };
};
export type MessageButtonEvent<T extends keyof MessageButtonEventDefinitions> = MessageButtonEventDefinitions[T];

export class MessageButton extends BaseEventSystem<MessageButtonEventDefinitions> {
    private readonly text: string;
    private autoRemove: boolean = true;
    private message?: Message;

    /**
     * @param text Text displayed on the button
     */
    constructor(text: string, options?: MessageButtonOptions) {
        super()
        this.text = text;

        if (options) {
            if (options.auto_remove !== undefined) {
                this.autoRemove = options.auto_remove;
            }
        }

        this.Click = this.Click.bind(this);
    }

    /**
     * Get the text inside the button
     */
    public get Text(): string {
        return this.text;
    }

    /**
     * Set the message associated with the button
     */
    public set Message(message: Message) {
        this.message = message;
    }

    /**
     * Trigger button click
     */
    public Click(): void {
        const { message, autoRemove } = this;
        if (!message) return;

        this.emit("Clicked", { detail: message });

        if (autoRemove) {
            message.Remove();
        }
    }
}

type MessageType = "NORMAL" | "ALERT" | "ERROR";

export interface Message {
    text: string;
}

export class Message {
    public static Type = class {
        /** `NORMAL`: Normal message, will be automatically removed after a delay if no button is present, or can be removed via command. */
        public static readonly NORMAL: MessageType = "NORMAL";
        /** `ALERT`: Alert message, must be manually removed or removed via command. */
        public static readonly ALERT: MessageType = "ALERT";
        /** `ERROR`: Error message, will be automatically removed after a delay if no button is present, or can be removed via command. */
        public static readonly ERROR: MessageType = "ERROR";
    }

    public readonly _type: MessageType;
    private readonly _text: string;
    private _buttons: MessageButton[] = [];
    private id?: string;
    private manager?: MessageManager;

    constructor(type: MessageType, text: string, buttons: MessageButton[] = []) {
        this._type = type;
        this._text = text;
        this._buttons = buttons;

        buttons.forEach(button => {
            button.Message = this;
        });
    }

    public get Type(): MessageType {
        return this._type;
    }

    public get Text(): string {
        return this._text;
    }

    public set Id(id: string) {
        this.id = id;
    }

    public get Id(): string {
        return this.id || "";
    }

    /**
     * Add a new button
     * @param button 
     */
    public AddButton(button: MessageButton): void {
        button.Message = this;
        this._buttons.push(button);
    }

    /**
     * Check if the message contains a button
     */
    public get HasButton(): boolean {
        return this._buttons.length > 0;
    }

    /**
     * Get the buttons associated with the message
     */
    public get Buttons(): MessageButton[] {
        return this._buttons;
    }

    /**
     * Set the manager associated with the message
     */
    public set Manager(manager: MessageManager) {
        this.manager = manager;
    }

    /**
     * Remove the message
     */
    public Remove(): void {
        if (!this.manager || !this.id) return;
        this.manager.Remove(this.id);
    }
}

type MessageManagerEventDefinitions = {
    "MessagesChanged": { detail: Message[] };
    "ErrorOccurred": { detail: { message: string, error: Error } };
};
export type MessageManagerEvent<T extends keyof MessageManagerEventDefinitions> = MessageManagerEventDefinitions[T];

export default class MessageManager extends BaseEventSystem<MessageManagerEventDefinitions> {
    private messages: Message[] = [];

    private static get CreateId(): string {
        const buf = new Uint16Array(8);
        crypto.getRandomValues(buf);
        return Array.from(buf).map((num) => (num < 0x10000 ? '0' : '') + num.toString(16)).join('-');
    }

    /**
     * Add a message to the manager
     * @param message 
     */
    public Append(message: Message): void {
        message.Id = MessageManager.CreateId;
        message.Manager = this;

        let autoRemove = 0;
        switch (message.Type) {
            case Message.Type.ALERT: {
                if (!message.HasButton) {
                    const button = new MessageButton("");
                    message.AddButton(button);
                }
                break;
            }
            case Message.Type.NORMAL: {
                autoRemove = 3000;
                break;
            }
            case Message.Type.ERROR: {
                autoRemove = 5000;
                break;
            }
        }

        this.messages.push(message);

        if (!message.HasButton && autoRemove !== 0) {
            setTimeout(() => this.Remove(message.Id), autoRemove);
        }

        this.emit("MessagesChanged", { detail: this.messages });
    }

    /**
     * Remove a message
     * @param messageId 
     */
    public Remove(messageId: string): void {
        const { messages } = this;
        const index = messages.findIndex((message) => message.Id === messageId);

        if (index > -1) {
            this.messages = [...messages.slice(0, index), ...messages.slice(index + 1)];

            this.emit("MessagesChanged", { detail: this.messages });
        }
    }
}
