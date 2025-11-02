import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeatMapViewer } from './seat-map-viewer';

describe('SeatMapViewer', () => {
  let component: SeatMapViewer;
  let fixture: ComponentFixture<SeatMapViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeatMapViewer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeatMapViewer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
