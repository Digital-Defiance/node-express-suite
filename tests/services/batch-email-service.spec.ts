/**
 * Tests for IBatchEmailService support across the bundled email transports
 * (Fake, Dummy, Postfix) and the runtime guard {@link isBatchEmailService}.
 */
import { isBatchEmailService } from '../../src/interfaces/batch-email-service';
import { DummyEmailService } from '../../src/services/dummy-email-service';
import { FakeEmailService } from '../../src/services/fake-email-service';
import { PostfixEmailService } from '../../src/services/postfixEmail';

describe('isBatchEmailService', () => {
  it('returns true for FakeEmailService instances', () => {
    FakeEmailService.resetInstance();
    const fake = FakeEmailService.getInstance({} as never);
    expect(isBatchEmailService(fake)).toBe(true);
  });

  it('returns true for DummyEmailService instances', () => {
    const dummy = new DummyEmailService({} as never);
    expect(isBatchEmailService(dummy)).toBe(true);
  });

  it('returns true for PostfixEmailService instances', () => {
    const postfix = PostfixEmailService.fromConfig({
      host: 'localhost',
      port: 25,
      emailSender: 'noreply@example.com',
      disableEmailSend: true,
    });
    expect(isBatchEmailService(postfix)).toBe(true);
  });

  it('returns false for a transport that only implements sendEmail', () => {
    const legacy = {
      sendEmail: async () => undefined,
    };
    expect(isBatchEmailService(legacy)).toBe(false);
  });

  it('returns false when sendEmailBatch is not a function', () => {
    const broken = {
      sendEmail: async () => undefined,
      sendEmailBatch: 'not-a-function',
    };
    expect(isBatchEmailService(broken)).toBe(false);
  });
});

describe('FakeEmailService.sendEmailBatch', () => {
  let service: FakeEmailService;

  beforeEach(() => {
    FakeEmailService.resetInstance();
    service = FakeEmailService.getInstance({} as never);
  });

  afterEach(() => {
    FakeEmailService.resetInstance();
  });

  it('captures a batch with To/CC/BCC arrays and message bodies', async () => {
    await service.sendEmailBatch({
      to: ['a@example.com', 'b@example.com'],
      cc: ['c@example.com'],
      bcc: ['d@example.com'],
      subject: 'Hello',
      text: 'plain',
      html: '<p>plain</p>',
    });

    const batches = service.getBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({
      to: ['a@example.com', 'b@example.com'],
      cc: ['c@example.com'],
      bcc: ['d@example.com'],
      subject: 'Hello',
      text: 'plain',
      html: '<p>plain</p>',
    });
    expect(batches[0].timestamp).toBeInstanceOf(Date);
  });

  it('mirrors batch entries into per-recipient capture for backward compat', async () => {
    await service.sendEmailBatch({
      to: ['a@example.com'],
      cc: ['c@example.com'],
      bcc: ['d@example.com'],
      subject: 'Mirror',
      text: 't',
      html: 'h',
    });

    expect(service.getEmails('a@example.com')).toHaveLength(1);
    expect(service.getEmails('c@example.com')).toHaveLength(1);
    expect(service.getEmails('d@example.com')).toHaveLength(1);
    expect(service.getLatestEmail('a@example.com')).toMatchObject({
      to: 'a@example.com',
      subject: 'Mirror',
    });
  });

  it('treats an all-empty input as a no-op', async () => {
    await service.sendEmailBatch({
      to: [],
      cc: [],
      bcc: [],
      subject: 's',
      text: 't',
      html: 'h',
    });

    expect(service.getBatches()).toHaveLength(0);
    expect(service.getLatestBatch()).toBeUndefined();
  });

  it('treats omitted cc/bcc as empty arrays', async () => {
    await service.sendEmailBatch({
      to: ['a@example.com'],
      subject: 's',
      text: 't',
      html: 'h',
    });

    const latest = service.getLatestBatch();
    expect(latest).toBeDefined();
    expect(latest?.cc).toEqual([]);
    expect(latest?.bcc).toEqual([]);
  });

  it('clear() empties both per-recipient and batch capture', async () => {
    await service.sendEmailBatch({
      to: ['a@example.com'],
      subject: 's',
      text: 't',
      html: 'h',
    });

    service.clear();
    expect(service.getBatches()).toHaveLength(0);
    expect(service.getLatestBatch()).toBeUndefined();
    expect(service.getEmails('a@example.com')).toHaveLength(0);
  });

  it('preserves order of multiple batch sends', async () => {
    await service.sendEmailBatch({
      to: ['a@example.com'],
      subject: 'first',
      text: 't',
      html: 'h',
    });
    await service.sendEmailBatch({
      to: ['b@example.com'],
      subject: 'second',
      text: 't',
      html: 'h',
    });

    const batches = service.getBatches();
    expect(batches.map((b) => b.subject)).toEqual(['first', 'second']);
    expect(service.getLatestBatch()?.subject).toBe('second');
  });
});

describe('DummyEmailService.sendEmailBatch', () => {
  it('resolves to undefined and captures nothing', async () => {
    const dummy = new DummyEmailService({} as never);
    await expect(
      dummy.sendEmailBatch({
        to: ['a@example.com'],
        subject: 's',
        text: 't',
        html: 'h',
      }),
    ).resolves.toBeUndefined();
  });

  it('handles all-empty input without throwing', async () => {
    const dummy = new DummyEmailService({} as never);
    await expect(
      dummy.sendEmailBatch({
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        text: '',
        html: '',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('PostfixEmailService.sendEmailBatch', () => {
  function makeServiceWithMockTransport(
    opts: { disableEmailSend?: boolean } = {},
  ) {
    const service = PostfixEmailService.fromConfig({
      host: 'localhost',
      port: 25,
      emailSender: 'noreply@example.com',
      disableEmailSend: opts.disableEmailSend ?? false,
    });
    // The instance's `transporter` field is non-configurable, but the
    // transporter object itself is plain — we can replace its `sendMail`
    // method directly without redefining the parent property.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transporter = (service as any).transporter as { sendMail: unknown };
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'msg-123' });
    transporter.sendMail = sendMail;
    return { service, sendMail };
  }

  it('passes To/CC/BCC arrays through verbatim in a single sendMail call', async () => {
    const { service, sendMail } = makeServiceWithMockTransport();

    await service.sendEmailBatch({
      to: ['a@example.com', 'b@example.com'],
      cc: ['c@example.com'],
      bcc: ['d@example.com'],
      subject: 'Hello',
      text: 'plain',
      html: '<p>plain</p>',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: ['a@example.com', 'b@example.com'],
      cc: ['c@example.com'],
      bcc: ['d@example.com'],
      subject: 'Hello',
      text: 'plain',
      html: '<p>plain</p>',
    });
  });

  it('omits empty cc/bcc fields so SMTP headers stay clean', async () => {
    const { service, sendMail } = makeServiceWithMockTransport();

    await service.sendEmailBatch({
      to: ['a@example.com'],
      subject: 's',
      text: 't',
      html: 'h',
    });

    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toEqual(['a@example.com']);
    expect(arg.cc).toBeUndefined();
    expect(arg.bcc).toBeUndefined();
  });

  it('omits an empty To when only CC is present', async () => {
    const { service, sendMail } = makeServiceWithMockTransport();

    await service.sendEmailBatch({
      to: [],
      cc: ['c@example.com'],
      subject: 's',
      text: 't',
      html: 'h',
    });

    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBeUndefined();
    expect(arg.cc).toEqual(['c@example.com']);
  });

  it('returns early without calling sendMail on all-empty input', async () => {
    const { service, sendMail } = makeServiceWithMockTransport();

    await service.sendEmailBatch({
      to: [],
      cc: [],
      bcc: [],
      subject: 's',
      text: 't',
      html: 'h',
    });

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('honors disableEmailSend by skipping sendMail entirely', async () => {
    const { service, sendMail } = makeServiceWithMockTransport({
      disableEmailSend: true,
    });

    await service.sendEmailBatch({
      to: ['a@example.com'],
      subject: 's',
      text: 't',
      html: 'h',
    });

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('wraps transport errors with a descriptive message', async () => {
    const { service } = makeServiceWithMockTransport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transporter = (service as any).transporter as { sendMail: unknown };
    transporter.sendMail = jest.fn().mockRejectedValue(new Error('SMTP down'));

    await expect(
      service.sendEmailBatch({
        to: ['a@example.com'],
        subject: 's',
        text: 't',
        html: 'h',
      }),
    ).rejects.toThrow(/Failed to send batch email via Postfix: SMTP down/);
  });
});
