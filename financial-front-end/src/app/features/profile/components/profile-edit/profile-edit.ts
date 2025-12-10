import { Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal, QueryList } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, Observable, of, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage, ImageTransform } from 'ngx-image-cropper';
import { CustomValidators } from 'ng2-validation';

import { User } from '../../../../shared/models/user';
import { DisplayMessage, GenericValidator, ValidationMessages } from '../../../../shared/utils/generic-form-validation';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-edit',
  imports: [ImageCropperComponent, ReactiveFormsModule],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.css'
})
export class ProfileEdit {
  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;

  errors: WritableSignal<any[]> = signal([]);

  controlBlurs: Observable<any>[];
  changesNotSaved: boolean;

  userTransaction: User;
  user: any;
  profileForm!: FormGroup;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = { name: '', email: '', password: '', confirmPassword: '', image: '', imageUpload: '' };

  imageChangedEvent: Event = null;
  croppedImage = signal<string>('');
  canvasRotation = 0;
  rotation = 0;
  scale = 1;
  showCropper = false;
  containWithinAspectRatio = false;
  transform: ImageTransform = {};
  imageUrl: string;
  imageName: string = '';

  constructor(private fb: FormBuilder,
    private destroyRef: DestroyRef,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private profileTransactionService: ProfileService,
  ) {
    this.validationMessages = {
      name: {
        required: 'Informe o nome',
        minlength: 'O nome deve ter no mínimo 5 caracteres',
        maxlength: 'O nome deve ter no máximo 60 caracteres',
        rangeLength: 'O nome deve ter entre 5 e 60 caracteres'
      },
      email: {
        required: 'Informe o e-mail',
        email: 'Informe um e-mail válido'
      },
      password: {
        rangeLength: 'A senha deve possuir entre 6 e 20 caracteres'
      },
      confirmPassword: {
        rangeLength: 'A senha deve possuir entre 6 e 20 caracteres',
        equalTo: 'As senhas não conferem'
      }
    };

    this.genericValidator = new GenericValidator(this.validationMessages);

    this.destroyRef.onDestroy(() => {
      console.log('Componente profileEdit está sendo destruído.');
    });

    this.user = this.route.snapshot.data['user'];
  }

  ngOnInit() {

    let passwordControl = new FormControl('', [CustomValidators.rangeLength([6, 20])]);
    let confirmPasswordControl = new FormControl('', [CustomValidators.rangeLength([6, 20]), CustomValidators.equalTo(passwordControl)]);

    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      password: passwordControl,
      confirmPassword: confirmPasswordControl,
      image: [''],
      imageUpload: ['']
    });

    this.profileForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      image: this.user.image,
      imageUpload: this.user.imageUpload
    });
  }

  ngAfterViewInit(): void {
    this.setupControlBlurObservable();

    this.formInputElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.setupControlBlurObservable();
      });
  }

  private setupControlBlurObservable() {

    const elementsChange$ = merge(
      of(this.formInputElements),
      this.formInputElements.changes
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap((list: QueryList<ElementRef>) => {
        const controlBlurs = list.toArray()
          .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));
        return merge(...controlBlurs);
      })
    );

    elementsChange$.subscribe(() => {
      this.displayMessage = this.genericValidator.processMessages(this.profileForm);
      this.changesNotSaved = true;
    });

  }
  //ADICIONAR ROTA DO JSON SERVER PRA ATUALIZAR USUARIO E INSERIR IMAGEM NA CHAMADA
  updateUser() {
    if (this.profileForm.dirty && this.profileForm.valid) {

      this.userTransaction = Object.assign({}, this.userTransaction, this.profileForm.value);

      this.profileTransactionService.updateProfile(this.user.id.toString(),
        this.userTransaction)
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (success) => {
            this.processSuccess(success)
          },
          error: (fail) => {
            this.processFail(fail)
          },
          complete: () => {
            console.log(this.userTransaction)
            this.changesNotSaved = false;
          }
        })
    }
  }

  processSuccess(response: User) {

    this.errors.set([]);
    this.toastr.success('Usuario atualizado com sucesso!', 'Atualização de Usuário', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });

    this.router.navigate(['/profile/user-profile']);

  }

  processFail(fail: any) {

    this.errors.set([]);
    this.errors.set(fail.error.errors.map((error: any) => error['msg']));
    this.toastr.error('Ocorreu um erro!', 'Atualização de Usuário', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
    this.imageName = (this.imageChangedEvent.target as HTMLInputElement).files[0].name;
  }
  imageCropped(event: ImageCroppedEvent) {
    const blobUrl = URL.createObjectURL(event.blob);
    this.croppedImage.set(blobUrl);
  }
  imageLoaded() {
    this.showCropper = true;
  }
  cropperReady() {
    // cropper ready
    console.log('Cropper ready');
  }
  loadImageFailed() {
    // show message
  }

}
