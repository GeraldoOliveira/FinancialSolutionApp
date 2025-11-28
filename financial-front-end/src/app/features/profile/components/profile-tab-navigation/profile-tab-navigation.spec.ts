import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileTabNavigation } from './profile-tab-navigation';

describe('ProfileTabNavigation', () => {
  let component: ProfileTabNavigation;
  let fixture: ComponentFixture<ProfileTabNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileTabNavigation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileTabNavigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
