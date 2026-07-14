"use client";

import { useActionState, useEffect, useState } from "react";
import { format } from "date-fns";
import { LogIn, LogOut, MapPin, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import { checkIn, checkOut } from "@/server/actions/attendance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/layout/submit-button";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AttendanceRecord } from "@/lib/types";

type Coords = { latitude: number; longitude: number } | null;

export function CheckInCard({ today }: { today: AttendanceRecord | null }) {
  const [coords, setCoords] = useState<Coords>(null);
  const [geoState, setGeoState] = useState<"loading" | "ok" | "denied">("loading");

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
