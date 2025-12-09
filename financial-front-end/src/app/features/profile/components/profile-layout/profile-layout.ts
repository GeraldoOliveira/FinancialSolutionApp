import { Component } from '@angular/core';
import { TabNavigation, TabItem } from '../../../../shared/components/tab-navigation/tab-navigation';
import { RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-profile-layout',
  imports: [TabNavigation, RouterOutlet],
  templateUrl: './profile-layout.html',
  styleUrl: './profile-layout.css'
})
export class ProfileLayout {
  settingsTabs: TabItem[] = [
    { label: 'Perfil', route: '/profile/user' },
    { label: 'Editar Perfil', route: '/profile/edit/1' },
    { label: 'Configurações', route: '/profile/settings' },
    // { label: 'Segurança', route: '/profile/security' },
  ];

  handleTabChange(route: string) {
    // Opcional: Lógica extra aqui se não depender apenas do routerLink
    console.log('Nova aba selecionada:', route);
  }
}
