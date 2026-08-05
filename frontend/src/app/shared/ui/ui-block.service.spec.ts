import { TestBed } from '@angular/core/testing';
import { UiBlockService } from './ui-block.service';

describe('UiBlockService', () => {
  let service: UiBlockService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UiBlockService] });
    service = TestBed.inject(UiBlockService);
  });

  it('show/hide aninhados mantêm overlay até depth zero', () => {
    expect(service.active()).toBeFalse();

    service.show('A');
    expect(service.active()).toBeTrue();
    expect(service.message()).toBe('A');

    service.show('B');
    expect(service.active()).toBeTrue();
    expect(service.message()).toBe('B');

    service.hide();
    expect(service.active()).toBeTrue();

    service.hide();
    expect(service.active()).toBeFalse();
  });

  it('reset limpa o bloqueio', () => {
    service.show('X');
    service.show('Y');
    service.reset();
    expect(service.active()).toBeFalse();
  });

  it('update só altera mensagem quando ativo', () => {
    service.update('ignorado');
    expect(service.message()).toBe('Carregando…');

    service.show('Aberto');
    service.update('Atualizado');
    expect(service.message()).toBe('Atualizado');
  });
});
