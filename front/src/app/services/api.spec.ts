import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApiService } from './api';

describe('ApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  });

  it('should be created', () => {
    expect(TestBed.inject(ApiService)).toBeTruthy();
  });
});
