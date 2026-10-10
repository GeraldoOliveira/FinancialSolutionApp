import { Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal, QueryList } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, Observable, of, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage, ImageTransform } from 'ngx-image-cropper';
import { CustomValidators } from '../../../../shared/utils/custom-validators';

import { User } from '../../../../shared/models/user';
import { DisplayMessage, GenericValidator, ValidationMessages } from '../../../../shared/utils/generic-form-validation';
import { ProfileService } from '../../services/profile.service';
import { DomSanitizer } from '@angular/platform-browser';
import { LocalStorageUtils } from '../../../../shared/utils/local-storage';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageCropperComponent, ReactiveFormsModule],
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

  imageChangedEvent: any = null;
  croppedImage = signal<string>('');
  tempCroppedImage = signal<string>('');
  isCropping = signal<boolean>(false);
  imageName = signal<string>('');

  canvasRotation = 0;
  rotation = 0;
  scale = 1;
  showCropper = false;
  containWithinAspectRatio = false;
  transform: ImageTransform = {};

  localStorageUtils = new LocalStorageUtils();

  constructor(
    private fb: FormBuilder,
    private destroyRef: DestroyRef,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private profileTransactionService: ProfileService,
    private sanitizer: DomSanitizer
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

    // Carrega dados do usuário (resolver ou fallback localStorage)
    const resolvedUser = this.route.snapshot.data['user'];
    const localUser = this.localStorageUtils.getUser();
    this.user = { ...(localUser || {}), ...(resolvedUser || {}) };
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

    if (this.user) {
      this.profileForm.patchValue({
        name: this.user.name || '',
        email: this.user.email || '',
        password: this.user.password || '',
        confirmPassword: this.user.password || ''
      });

      const existingImage = this.user.imageUpload || this.user.image || '';
      this.croppedImage.set(existingImage);
      this.imageName.set(this.user.image || '');
    }
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

  // --- Gerenciamento de Upload & Recorte ---

  fileChangeEvent(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input?.files;

    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).', 'Arquivo Inválido');
      return;
    }

    this.imageName.set(file.name);
    this.imageChangedEvent = event;
    this.canvasRotation = 0;
    this.transform = {};
    this.showCropper = true;
    this.isCropping.set(true);
  }

  imageCropped(event: ImageCroppedEvent) {
    if (event.base64) {
      this.tempCroppedImage.set(event.base64);
    } else if (event.blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.tempCroppedImage.set(reader.result as string);
      };
      reader.readAsDataURL(event.blob);
    } else if (event.objectUrl) {
      this.tempCroppedImage.set(event.objectUrl);
    }
  }

  applyCrop(): void {
    const cropped = this.tempCroppedImage();
    if (cropped) {
      this.croppedImage.set(cropped);
      this.profileForm.patchValue({
        imageUpload: cropped,
        image: this.imageName()
      });
      this.toastr.success('Foto recortada com sucesso! Lembre-se de salvar as alterações.', 'Foto Atualizada');
    }
    this.isCropping.set(false);
  }

  cancelCrop(): void {
    this.isCropping.set(false);
    this.imageChangedEvent = null;
    this.tempCroppedImage.set('');
  }

  removePhoto(): void {
    this.croppedImage.set('');
    this.tempCroppedImage.set('');
    this.imageName.set('');
    this.profileForm.patchValue({
      imageUpload: '',
      image: ''
    });
    this.toastr.info('Foto removida. Salve o perfil para confirmar a alteração.', 'Foto Removida');
  }

  rotateLeft(): void {
    this.canvasRotation--;
    this.flipAfterRotate();
  }

  rotateRight(): void {
    this.canvasRotation++;
    this.flipAfterRotate();
  }

  flipHorizontal(): void {
    this.transform = {
      ...this.transform,
      flipH: !this.transform.flipH
    };
  }

  flipVertical(): void {
    this.transform = {
      ...this.transform,
      flipV: !this.transform.flipV
    };
  }

  resetImage(): void {
    this.canvasRotation = 0;
    this.transform = {};
  }

  private flipAfterRotate(): void {
    const flippedH = this.transform.flipH;
    const flippedV = this.transform.flipV;
    this.transform = {
      ...this.transform,
      flipH: flippedV,
      flipV: flippedH
    };
  }

  imageLoaded() {
    this.showCropper = true;
  }

  cropperReady() {
    console.log('Cropper pronto para ajuste.');
  }

  loadImageFailed() {
    this.toastr.error('Falha ao processar o formato da imagem selecionada.', 'Erro');
    this.isCropping.set(false);
  }

  // --- Salvar Perfil ---

  updateUser() {
    if (this.profileForm.valid) {
      this.userTransaction = Object.assign({}, this.userTransaction, this.profileForm.value);
      this.userTransaction.id = this.user?.id || 1;
      this.userTransaction.imageUpload = this.croppedImage();
      this.userTransaction.image = this.imageName();

      this.profileTransactionService.updateProfile(this.userTransaction)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (success) => {
            this.processSuccess(success || this.userTransaction);
          },
          error: () => {
            // Se falhar o backend mock, ainda persiste localmente no LocalStorage
            this.processSuccess(this.userTransaction);
          },
          complete: () => {
            this.changesNotSaved = false;
          }
        });
    }
  }

  processSuccess(response: User) {
    this.errors.set([]);

    // Atualiza o usuário gravado no LocalStorage para que o header e o perfil reflitam imediatamente a foto
    const stored = this.localStorageUtils.getUser() || {};
    const updatedUser = {
      ...stored,
      ...this.userTransaction,
      id: this.user?.id || stored.id || 1,
      imageUpload: this.croppedImage() || stored.imageUpload || '',
      image: this.imageName() || stored.image || ''
    };

    this.localStorageUtils.saveUser(updatedUser);

    this.toastr.success('Perfil e foto atualizados com sucesso!', 'Sucesso', {
      easeTime: 200,
      timeOut: 2000,
      progressBar: true,
      closeButton: true
    });

    this.router.navigate(['/profile/user/' + (updatedUser.id || 1)]);
  }

  processFail(fail: any) {
    this.errors.set([]);
    if (fail?.error?.errors) {
      this.errors.set(fail.error.errors.map((error: any) => error['msg']));
    }
    this.toastr.error('Ocorreu um erro ao atualizar o usuário.', 'Erro');
  }
}
