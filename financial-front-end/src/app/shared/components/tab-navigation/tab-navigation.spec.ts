import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabNavigation } from './tab-navigation';

describe('TabNavigation', () => {
  let component: TabNavigation;
  let fixture: ComponentFixture<TabNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabNavigation]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TabNavigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
