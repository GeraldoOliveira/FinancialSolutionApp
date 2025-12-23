import { DestroyRef, ElementRef, inject, QueryList } from "@angular/core";
import { DisplayMessage, GenericValidator, ValidationMessages } from "../shared/utils/generic-form-validation";
import { FormGroup } from "@angular/forms";
import { fromEvent, merge, Observable, of, switchMap } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

export abstract class FormBaseComponent {

    protected destroyRef = inject(DestroyRef);
    protected controlBlurs: Observable<any>[];
    protected changesNotSaved: boolean;

    validationMessages!: ValidationMessages;
    genericValidator!: GenericValidator;
    displayMessage: DisplayMessage = { name: '', description: '', totalValue: '', methodList: '', creditCardList: '', installments: '', responsible: '', proratedValue: '', categoryList: '', date: '' };


    protected configureMessageValidationBase(validationMessages: ValidationMessages) {
        this.genericValidator = new GenericValidator(validationMessages);
    }

    protected configureValidationFormBase(formInputElements: QueryList<ElementRef>, formGroup: FormGroup) {

        const elementsChange$ = merge(
            of(formInputElements),
            formInputElements.changes
        ).pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((list: QueryList<ElementRef>) => {
                this.controlBlurs = list.toArray()
                    .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));
                return merge(...this.controlBlurs);
            })
        );

        elementsChange$.subscribe(() => {
            this.displayMessage = this.genericValidator.processMessages(formGroup);
            this.changesNotSaved = true;
        });

    }
}