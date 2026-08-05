import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { PetVaccination } from '../models/pet-vaccination.model';
import { PetVaccinationService } from './pet-vaccination.service';

describe('PetVaccinationService (S5)', () => {
  let service: PetVaccinationService;
  let httpMock: HttpTestingController;
  const petId = 'pet-1';
  const api = `${environment.apiUrl.replace(/\/$/, '')}/pets/${petId}/vaccinations`;

  const sample: PetVaccination = {
    id: 'v1',
    petId,
    name: 'V10',
    appliedAt: '2026-01-10',
    nextDueAt: '2027-01-10'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PetVaccinationService]
    });
    service = TestBed.inject(PetVaccinationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listByPet GET /pets/:id/vaccinations', () => {
    service.listByPet(petId).subscribe((list) => {
      expect(list).toEqual([sample]);
    });

    const req = httpMock.expectOne(api);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush([sample]);
  });

  it('create POST com name trim e nextDueAt', () => {
    service
      .create({
        petId,
        name: '  Antirrábica ',
        appliedAt: '2026-08-01',
        nextDueAt: '2027-08-01'
      })
      .subscribe((res) => {
        expect(res.name).toBe('Antirrábica');
      });

    const req = httpMock.expectOne(api);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Antirrábica',
      appliedAt: '2026-08-01',
      nextDueAt: '2027-08-01'
    });
    req.flush({ ...sample, name: 'Antirrábica' });
  });
});
