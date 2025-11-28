import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileUser } from './profile-user';

describe('ProfileUser', () => {
  let component: ProfileUser;
  let fixture: ComponentFixture<ProfileUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileUser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
