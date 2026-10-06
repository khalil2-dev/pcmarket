import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthGuard } from './auth-guard';

describe('AuthGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('should be created', () => {
    expect(TestBed.inject(AuthGuard)).toBeTruthy();
  });
});
