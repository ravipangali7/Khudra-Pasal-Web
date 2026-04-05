import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getAuthToken, portalApi, publicFamilyJoinApi } from "@/lib/api";
import { normalizeNepalPhoneDigits } from "@/lib/nepalPhone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const JoinFamilyPage = () => {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = rawToken?.trim() ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const authed = Boolean(getAuthToken());

  const metaQuery = useQuery({
    queryKey: ["public", "family-join", token],
    queryFn: () => publicFamilyJoinApi.getMeta(token),
    enabled: Boolean(token),
    retry: false,
  });

  const prefillEnabled = Boolean(token) && authed;

  const meQuery = useQuery({
    queryKey: ["portal", "me", "join-family-prefill"],
    queryFn: () => portalApi.me(),
    enabled: prefillEnabled,
    retry: false,
  });

  const selfProfileQuery = useQuery({
    queryKey: ["portal", "self-profile", "join-family-prefill"],
    queryFn: () => portalApi.selfProfile(),
    enabled: prefillEnabled,
    retry: false,
  });

  useEffect(() => {
    const me = meQuery.data;
    const self = selfProfileQuery.data;
    const pick = (a?: string | null, b?: string | null) => {
      const t = (a?.trim() || b?.trim() || "").trim();
      return t;
    };

    const nameFrom = pick(me?.name, self?.name);
    const emailFrom = pick(me?.email, self?.email);
    const phoneRaw = pick(me?.phone, self?.phone);
    const phoneCanon = phoneRaw ? normalizeNepalPhoneDigits(phoneRaw) : null;
    const phoneForField = phoneCanon ?? phoneRaw;

    if (nameFrom) setName((prev) => prev || nameFrom);
    if (emailFrom) setEmail((prev) => prev || emailFrom);
    if (phoneForField) setPhone((prev) => prev || phoneForField);
  }, [meQuery.data, selfProfileQuery.data]);

  const submitMutation = useMutation({
    mutationFn: () =>
      publicFamilyJoinApi.submit(token, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        applicant_note: note.trim(),
      }),
  });

  const joinNextPath = useMemo(() => `/join-family/${token}`, [token]);
  const loginHref = `/login?next=${encodeURIComponent(joinNextPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(joinNextPath)}`;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This join link is missing a token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metaQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading invitation…</span>
      </div>
    );
  }

  if (metaQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link not available</CardTitle>
            <CardDescription>
              {metaQuery.error instanceof Error
                ? metaQuery.error.message
                : "This invitation may have expired or been revoked."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = metaQuery.data;
  if (!meta) return null;

  if (!authed) {
    const heading = meta.title?.trim() || `Join ${meta.group_name}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{heading}</CardTitle>
            <CardDescription>
              Sign in or create a KhudraPasal account to submit a join request for{" "}
              <span className="font-medium text-foreground">{meta.group_name}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link to={loginHref}>Log in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={signupHref}>Create account</Link>
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Request sent</CardTitle>
            <CardDescription>
              {submitMutation.data.message ||
                "The family organizer will review your request. You will be contacted if needed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const heading = meta.title?.trim() || `Join ${meta.group_name}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          {meta.welcome_message ? (
            <CardDescription className="text-foreground/80 whitespace-pre-wrap">
              {meta.welcome_message}
            </CardDescription>
          ) : (
            <CardDescription>
              Fill in your details to request access to this family on KhudraPasal. Your mobile number must match the
              account you signed in with.
            </CardDescription>
          )}
          {meta.expires_at ? (
            <p className="text-xs text-muted-foreground pt-1">
              This link expires {new Date(meta.expires_at).toLocaleString()}.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jf-name">Full name {meta.fields.name.required ? "*" : ""}</Label>
            <Input
              id="jf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required={meta.fields.name.required}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jf-email">Email</Label>
            <Input
              id="jf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jf-phone">Mobile number *</Label>
            <Input
              id="jf-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              autoComplete="tel"
              inputMode="numeric"
              placeholder="98xxxxxxxx"
              required
            />
            <p className="text-xs text-muted-foreground">Must match your signed-in account phone number.</p>
            {prefillEnabled &&
            !meQuery.isLoading &&
            !selfProfileQuery.isLoading &&
            (meQuery.isSuccess || selfProfileQuery.isSuccess) &&
            !(meQuery.data?.phone?.trim() || selfProfileQuery.data?.phone?.trim()) ? (
              <p className="text-xs text-amber-700 dark:text-amber-200">
                No phone number on this account yet. Add one in your KhudraPasal profile, then refresh this page.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jf-note">Message (optional)</Label>
            <Textarea
              id="jf-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Anything you want the organizer to know"
            />
          </div>
          {submitMutation.isError ? (
            <p className="text-sm text-destructive">
              {submitMutation.error instanceof Error
                ? submitMutation.error.message
                : "Could not submit. Please try again."}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              disabled={submitMutation.isPending || !name.trim() || !phone.trim()}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit request"
              )}
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinFamilyPage;
