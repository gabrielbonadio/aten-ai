import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { TeamMember } from '../models/team-member.model';
import { TeamService } from './team.service';

describe('TeamService (S2/S4)', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;
  const api = `${environment.apiUrl.replace(/\/$/, '')}/users`;

  const members: TeamMember[] = [
    { id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'ADMIN', active: true },
    { id: 'u2', name: 'Bob', email: 'bob@x.com', role: 'MEMBER', active: false },
    { id: 'u3', name: 'Cia', email: 'cia@x.com', role: 'MEMBER', active: true }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TeamService]
    });
    service = TestBed.inject(TeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listMembers GET /users com credentials', () => {
    service.listMembers().subscribe((list) => {
      expect(list.length).toBe(3);
    });

    const req = httpMock.expectOne(api);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(members);
  });

  it('invite POST /users/invites normaliza e-mail (S2)', () => {
    service.invite({ email: '  Novo@Clinica.COM ', role: 'MEMBER' }).subscribe((res) => {
      expect(res.message).toContain('enviado');
    });

    const req = httpMock.expectOne(`${api}/invites`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'novo@clinica.com', role: 'MEMBER' });
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ message: 'Convite enviado' });
  });

  it('listProfessionals filtra inativos (S4)', () => {
    service.listProfessionals().subscribe((list) => {
      expect(list.map((m) => m.id)).toEqual(['u1', 'u3']);
    });

    const req = httpMock.expectOne(api);
    req.flush(members);
  });
});
