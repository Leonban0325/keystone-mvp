import { useApp } from './store'
import { Badge, Button } from './components'
import { formatDate } from './format'

/**
 * G §5: the verification flow surfaced where it matters — a party's profile
 * and onboarding. Multi-step, stateful, gated: the badge appears only after
 * every step (and every beneficial owner, for companies) has passed.
 */
export default function VerificationPanel(props: {
  partyId: string
  name: string
  kind: 'individual' | 'company'
}) {
  const { world, rev, mutate } = useApp()
  void rev
  const record = world.verification(props.partyId)

  if (!record) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-greyx">
          {props.kind === 'company' ? 'Business verification (KYB)' : 'Identity verification (KYC)'}{' '}
          not started for <span className="text-ink">{props.name}</span>.
        </span>
        <Button
          tone="quiet"
          onClick={() => mutate((w) => w.startVerification(props.partyId, props.name, props.kind))}
        >
          Start verification
        </Button>
      </div>
    )
  }

  const nextStep = record.steps.find((s) => s.status === 'pending')
  const nextUbo = record.ubos?.find((u) => !u.verified)

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{record.name}</span>
          <Badge tone="grey">{record.kind === 'company' ? 'KYB' : 'KYC'}</Badge>
          {record.status === 'verified' ? (
            <Badge tone="green">Verified · {formatDate(record.completedOn!)}</Badge>
          ) : (
            <Badge tone="brass">In progress</Badge>
          )}
        </div>
        {record.status !== 'verified' && nextStep && (
          <Button tone="primary" onClick={() => mutate((w) => w.advanceVerification(props.partyId))}>
            {nextStep.id === 'ubo-kyc' && nextUbo ? `Verify ${nextUbo.name}` : `Run: ${nextStep.label}`}
          </Button>
        )}
      </div>

      <ol className="mt-3 space-y-0">
        {record.steps.map((step) => (
          <li
            key={step.id}
            className={`grid grid-cols-[180px_1fr] gap-3 border-l-2 py-2 pl-3 ${
              step.status === 'passed' ? 'border-[#3D6B47]' : 'border-hairline opacity-70'
            }`}
          >
            <div className="text-xs text-greyx">
              <div className="font-medium text-ink">{step.label}</div>
              <div>{step.system}</div>
            </div>
            <div className="text-xs">
              {step.status === 'passed' ? (
                <>
                  <span className="text-[#3D6B47]">✓ {step.at && formatDate(step.at)}</span>
                  {step.result && <div className="mt-1 text-greyx">{step.result}</div>}
                  {step.id === 'ubo' && record.ubos && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {record.ubos.map((ubo) => (
                        <Badge key={ubo.name} tone={ubo.verified ? 'green' : 'grey'}>
                          {ubo.name} · {ubo.sharePct}%{ubo.verified ? ' ✓' : ''}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-greyx">
                  {step.id === 'ubo-kyc' && record.ubos
                    ? `${record.ubos.filter((u) => u.verified).length}/${record.ubos.length} beneficial owners verified`
                    : 'Pending — gated on the steps above'}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
