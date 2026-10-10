import { Component } from '@angular/core';


@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  year: any = new Date().getFullYear();
}
