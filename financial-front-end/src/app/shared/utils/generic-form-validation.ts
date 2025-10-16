import { ControlEvent, FormArray, FormGroup } from '@angular/forms';

export class GenericValidator {
    constructor(private validationMessages: ValidationMessages) { }

    processMessages(container: any): { [key: string]: string } {
        let messages = {};
        for (let controlKey in container.controls) {
            if (container.controls.hasOwnProperty(controlKey)) {
                let c = container.controls[controlKey];

                if (c instanceof FormGroup) {
                    let childMessages = this.processMessages(c);
                    Object.assign(messages, childMessages);
                } else if (c instanceof FormArray) {
                    let childMessages = this.processMessagesArray(c);
                    Object.assign(messages, childMessages);
                } else {
                    if (this.validationMessages[controlKey]) {
                        messages[controlKey] = '';
                        if ((c.dirty || c.touched) && c.errors) {
                            Object.keys(c.errors).map(messageKey => {
                                if (this.validationMessages[controlKey][messageKey]) {
                                    messages[controlKey] += this.validationMessages[controlKey][messageKey] + '<br />';
                                }
                            });
                        }
                    }
                }
            }
        }
        return messages;
    }

    processMessagesArray(container: any, index: string = null): { [key: string]: string } {
        let messages = {};
        for (let controlKey in container.controls) {
            let c = container.controls[controlKey];

            if (container.controls.hasOwnProperty(controlKey) && c instanceof FormGroup) {
                index = controlKey;
                let childMessages = this.processMessagesArray(c, index);
                Object.assign(messages, childMessages);
            } else {
                const uniqueKey = `${controlKey}_${index}`;
                if (this.validationMessages[controlKey]) {
                    messages[uniqueKey] = '';
                    if ((c.dirty || c.touched) && c.errors) {
                        Object.keys(c.errors).map(messageKey => {
                            if (this.validationMessages[controlKey][messageKey]) {
                                messages[uniqueKey] += this.validationMessages[controlKey][messageKey] + '<br />';
                            }
                        });
                    }
                }
            }
        }
        return messages;
    }
}


export interface DisplayMessage {
    [key: string]: string
}
export interface ValidationMessages {
    [key: string]: { [key: string]: string }
}
