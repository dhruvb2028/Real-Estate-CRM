"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, Loader2, LogIn, LogOut, MapPin, MapPinOff, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { checkIn, checkOut } from "@/server/actions/attendance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/layout/submit-button";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AttendanceRecord } from "@/lib/types";

type Coords = { latitude: number; longitude: number } | null;

export function CheckInCard({
  today,
  orgId,
  userId,
}: {
  today: AttendanceRecord | null;
  orgId: string;
  userId: string;
}) {
  const [coords, setCoords] = useState<Coords>(null);
  const [geoState, setGeoState] = useState<"loading" | "ok" | "denied">("loading");
  const [selfie, setSelfie] = useState<{ url: string; path: string } | null>(null);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const selfieRef = useRef<HTMLInputElement>(null);

  const checkedIn = !!today?.check_in_time;
  const checkedOut = !!today?.check_out_time;
  const action = checkedIn ? checkOut : checkIn;
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoState("ok");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.ok === false && state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d MMMM")}
            </p>
            {checkedIn ? (
              <p className="mt-0.5 text-sm">
                In at{" "}
                <span className="font-semibold">
                  {format(new Date(today!.check_in_time!), "h:mm a")}
                </span>
                {checkedOut && (
                  <>
                    {" · "}Out at{" "}
                    <span className="font-semibold">
                      {format(new Date(today!.check_out_time!), "h:mm a")}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">Not checked in yet</p>
            )}
          </div>
          {today && (
            <Badge variant={today.status === "late" ? "destructive" : "secondary"}>
              {ATTENDANCE_STATUS_LABELS[today.status]}
            </Badge>
          )}
        </div>

        <p
          className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            geoState === "ok"
              ? "bg-primary/10 text-primary"
              : geoState === "denied"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {geoState === "ok" ? (
            <>
              <MapPin className="size-4 shrink-0" aria-hidden />
              Location captured ({coords?.latitude.toFixed(4)}, {coords?.longitude.toFixed(4)})
            </>
          ) : geoState === "denied" ? (
            <>
              <MapPinOff className="size-4 shrink-0" aria-hidden />
              Location unavailable — attendance will be saved without GPS
            </>
          ) : (
            <>
              <MapPin className="size-4 shrink-0 animate-pulse" aria-hidden />
              Getting your location…
            </>
          )}
        </p>

        {checkedOut ? (
          <p className="rounded-lg bg-muted p-4 text-center text-sm font-medium text-muted-foreground">
            Day complete. See you tomorrow!
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
            {coords && (
              <>
                <input type="hidden" name="latitude" value={coords.latitude} />
                <input type="hidden" name="longitude" value={coords.longitude} />
              </>
            )}
            {selfie && <input type="hidden" name="selfieUrl" value={selfie.url} />}

            {!checkedIn && (
              <div className="flex items-center gap-3">
                {selfie ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selfie.url}
                      alt="Check-in selfie"
                      className="size-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const path = selfie.path;
                        setSelfie(null);
                        const supabase = createClient();
                        await supabase.storage.from("attendance-selfies").remove([path]);
                      }}
                      aria-label="Remove selfie"
                      className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1"
                    disabled={selfieUploading}
                    onClick={() => selfieRef.current?.click()}
                  >
                    {selfieUploading ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Camera className="size-4" aria-hidden />
                    )}
                    Add selfie (optional)
                  </Button>
                )}
                <input
                  ref={selfieRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  aria-label="Take a check-in selfie"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSelfieUploading(true);
                    const supabase = createClient();
                    const path = `${orgId}/${userId}/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.jpg`;
                    const { error } = await supabase.storage
                      .from("attendance-selfies")
                      .upload(path, file);
                    if (error) {
                      toast.error(`Selfie upload failed: ${error.message}`);
                    } else {
                      const { data } = await supabase.storage
                        .from("attendance-selfies")
                        .createSignedUrl(path, 60 * 60 * 24 * 365);
                      setSelfie({ url: data?.signedUrl ?? path, path });
                    }
                    setSelfieUploading(false);
                    if (selfieRef.current) selfieRef.current.value = "";
                  }}
                />
              </div>
            )}

            <Textarea
              name="notes"
              rows={2}
              placeholder={
                checkedIn ? "End-of-day notes (optional)…" : "Field visit notes (optional)…"
              }
              aria-label="Attendance notes"
            />
            <SubmitButton className="h-14 text-lg">
              {checkedIn ? (
                <>
                  <LogOut className="size-5" aria-hidden /> Check out
                </>
              ) : (
                <>
                  <LogIn className="size-5" aria-hidden /> Check in
                </>
              )}
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
