import { TestBed } from '@angular/core/testing';

import { ModificationState } from './modification-state';

describe('ModificationState', () => {
  let service: ModificationState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModificationState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
