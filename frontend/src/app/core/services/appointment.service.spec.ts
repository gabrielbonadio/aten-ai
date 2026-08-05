import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { Appointment } from '../models/appointment.model';
import { AppointmentService } from './appointment.service';

describe('AppointmentService (S0/S4)', () => {
  let service: AppointmentService;
  let httpMock: HttpTestingController;
  const api = `${environment.apiUrl.replace(/\/$/, '')}/appointments`;

  const sample: Appointment = {
    id: 'a1',
    petId: 'p1',
    type: 'CONSULTATION',
    scheduledAt: '2026-08-05T14:00:00.000Z',
    status: 'SCHEDULED'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AppointmentService]
    });
    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('updateStatus envia PATCH /appointments/:id/status (S0)', () => {
    service.updateStatus('a1', 'COMPLETED').subscribe((res) => {
      expect(res.status).toBe('COMPLETED');
    });

    const req = httpMock.expectOne(`${api}/a1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'COMPLETED' });
    req.flush({ ...sample, status: 'COMPLETED' });
  });

  it('findAll envia assignedUserId quando filtro ativo (S4)', () => {
    service.findAll({ assignedUserId: 'me' }).subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('a1');
    });

    const req = httpMock.expectOne(
      (r) => r.url === api && r.params.get('assignedUserId') === 'me'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ data: [sample], page: 1, pageSize: 100, total: 1 });
  });

  it('findAll sem filtro não envia assignedUserId', () => {
    service.findAll().subscribe();

    const req = httpMock.expectOne((r) => r.url === api);
    expect(req.request.params.get('assignedUserId')).toBeNull();
    req.flush([]);
  });
});
