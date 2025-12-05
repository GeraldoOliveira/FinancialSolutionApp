import { Component, Sanitizer, signal } from '@angular/core';

import { ImageCropperComponent, ImageCroppedEvent, LoadedImage, ImageTransform } from 'ngx-image-cropper';

@Component({
  selector: 'app-profile-edit',
  imports: [ImageCropperComponent],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.css'
})
export class ProfileEdit {

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

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
  }
  imageCropped(event: ImageCroppedEvent) {
    const blobUrl = URL.createObjectURL(event.blob);
    this.croppedImage.set(blobUrl);
    this.imageName = (this.imageChangedEvent.target as HTMLInputElement).files[0].name;
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
