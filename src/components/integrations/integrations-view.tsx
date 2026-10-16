import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { IntegrationLogo } from '@/components/integration-logos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { integrationsQuery } from '@/lib/queries/integrations'
import { BUILTINS, PROVIDERS } from '@/lib/integrations'
import type { ProviderMeta } from '@/lib/integrations'
import {
  addMcpServer,
  connectIntegration,
  disconnectIntegration,
  removeMcpServer,
  syncActivity,
  toggleBuiltinPlugin,
} from '@/server/integrations'
import type { IntegrationView } from '@/server/integrations'
import { cn } from '@/lib/utils'

export function IntegrationsView() {
  const queryClient = useQueryClient()
  const { data } = useQuery(integrationsQuery())
  const [connecting, setConnecting] = useState<ProviderMeta | null>(null)
  const [token, setToken] = useState('')

  const connectedByProvider: Partial<Record<string, IntegrationView>> = Object.fromEntries(
    (data?.integrations ?? []).map((i) => [i.provider, i]),
  )

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['integrations'] })
    void queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const connectMutation = useMutation({
    mutationFn: (vars: { provider: string; token: string }) =>
      connectIntegration({ data: vars }),
    onSuccess: (res) => {
      toast.success('Connected', { description: res.label })
      setConnecting(null)
      setToken('')
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not connect'),
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => disconnectIntegration({ data: { provider } }),
    onSuccess: () => {
      toast.success('Disconnected')
      invalidate()
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => syncActivity(),
    onSuccess: (res) => {
      toast.success(
        res.inserted === 0 ? 'Everything is up to date' : `Imported ${res.inserted} event${res.inserted === 1 ? '' : 's'}`,
        { description: res.synced.length ? `From ${res.synced.join(', ')}` : undefined },
      )
      invalidate()
    },
  })

  const hasSyncable = (data?.integrations ?? []).some(
    (i) => i.status === 'connected' && PROVIDERS.find((p) => p.id === i.provider)?.syncs,
  )

  return (
    <div className="space-y-10 px-6 py-6">
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-semibold tracking-tight">Integrations</h2>
            <p className="text-sm text-muted-foreground">
              Connect with a personal access token — stored securely server-side.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={!hasSyncable || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync now
          </Button>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-4 py-3 font-mono text-xs text-muted-foreground">
          <span>thread integrations ls</span>
          <span>
            {(data?.integrations ?? []).filter((i) => i.status === 'connected').length} connected ·{' '}
            {PROVIDERS.length} providers · secrets encrypted at rest
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const connection = connectedByProvider[provider.id]
            const connected = connection?.status === 'connected'
            return (
              <div key={provider.id} className="surface flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background"
                      style={{ color: provider.accent }}
                    >
                      <IntegrationLogo provider={provider.id} className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium leading-tight">{provider.name}</h3>
                        {provider.syncs ? (
                          <span className="rounded border border-border/70 bg-accent/60 px-1 py-px font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            syncs
                          </span>
                        ) : null}
                      </div>
                      {connected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-moss">
                          <Check className="h-3 w-3" />
                          {connection.account_label ?? 'Connected'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{provider.blurb}</p>

                <div className="mt-auto flex items-center gap-2">
                  {connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          disconnectMutation.mutate(provider.id)
                        }
                        disabled={disconnectMutation.isPending}
                      >
                        Disconnect
                      </Button>
                      {provider.syncs && <span className="text-xs text-muted-foreground">Auto-syncs to Logs</span>}
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setConnecting(provider)}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <McpSection />

      <BuiltinSection builtins={data?.builtins ?? []} />

      <Dialog
        open={connecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConnecting(null)
            setToken('')
          }
        }}
      >
        <DialogContent>
          {connecting && (
            <>
              <DialogHeader>
                <DialogTitle>Connect {connecting.name}</DialogTitle>
                <DialogDescription>
                  Paste a {connecting.tokenLabel.toLowerCase()}. We verify it against {connecting.name} and
                  store it server-side — it never reaches the browser again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="token">{connecting.tokenLabel}</Label>
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  placeholder={connecting.tokenPlaceholder}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <a
                  href={connecting.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-thread hover:underline"
                >
                  Create a token <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    connectMutation.mutate({ provider: connecting.id, token: token.trim() })
                  }
                  disabled={token.trim().length < 8 || connectMutation.isPending}
                >
                  {connectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify & connect
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function McpSection() {
  const queryClient = useQueryClient()
  const { data } = useQuery(integrationsQuery())
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['integrations'] })

  const addMutation = useMutation({
    mutationFn: () => addMcpServer({ data: { name: name.trim(), url: url.trim() } }),
    onSuccess: (res) => {
      toast.success(res.reachable ? 'MCP server connected' : 'MCP server saved (unreachable)', {
        description: res.reachable
          ? 'Handshake succeeded.'
          : 'We could not reach it yet — check the URL or auth.',
      })
      setOpen(false)
      setName('')
      setUrl('')
      void invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not add server'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeMcpServer({ data: { id } }),
    onSuccess: () => {
      toast.success('Removed')
      void invalidate()
    },
  })

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            MCP servers <Sparkles className="h-3.5 w-3.5 text-thread" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Add any remote Model Context Protocol server over HTTP.
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Server className="h-4 w-4" />
          Add server
        </Button>
      </div>

      {data && data.mcp.length > 0 ? (
        <ul className="surface divide-y divide-border/60">
          {data.mcp.map((server) => (
            <li key={server.id} className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-thread">
                <Server className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{server.name}</p>
                <p className="truncate text-xs text-muted-foreground">{server.url}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  server.enabled ? 'bg-moss/15 text-moss' : 'bg-accent text-muted-foreground',
                )}
              >
                {server.enabled ? 'Connected' : 'Saved'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMutation.mutate(server.id)}
                aria-label={`Remove ${server.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="surface px-5 py-8 text-center text-sm text-muted-foreground">
          No MCP servers yet. Add one to give your workspace tools.
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an MCP server</DialogTitle>
            <DialogDescription>
              Point Thread at a remote MCP endpoint. We'll attempt a handshake.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Name</Label>
              <Input
                id="mcp-name"
                placeholder="My tools"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-url">Endpoint URL</Label>
              <Input
                id="mcp-url"
                placeholder="https://example.com/mcp"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!name.trim() || !url.trim() || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function BuiltinSection({ builtins }: { builtins: { id: string; enabled: boolean }[] }) {
  const queryClient = useQueryClient()
  const enabledById = new Map(builtins.map((b) => [b.id, b.enabled]))

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; name: string; enabled: boolean }) =>
      toggleBuiltinPlugin({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-semibold tracking-tight">Built-in</h2>
        <p className="text-sm text-muted-foreground">Small helpers that run inside Thread.</p>
      </div>
      <ul className="surface divide-y divide-border/60">
        {BUILTINS.map((plugin) => {
          const enabled = enabledById.get(plugin.id) ?? plugin.defaultEnabled
          return (
            <li key={plugin.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{plugin.name}</p>
                <p className="text-xs text-muted-foreground">{plugin.blurb}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: plugin.id, name: plugin.name, enabled: checked })
                }
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
