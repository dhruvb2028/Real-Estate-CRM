"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { createProperty, updateProperty } from "@/server/actions/properties";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import { ImageUploader } from "@/components/properties/image-uploader";
import {
  AVAILABILITY_LABELS,
  FURNISHING_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import type { Property } from "@/lib/types";

export function PropertyForm({
  orgId,
  property,
}: {
  orgId: string;
  property?: Property;
}) {
  const [state, formAction] = useActionState(
    property ? updateProperty : createProperty,
    {}
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          {property && <input type="hidden" name="propertyId" value={property.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={property?.title}
              className="h-11"
              placeholder="Emerald Heights 3BHK"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                name="location"
                required
                defaultValue={property?.location}
                className="h-11"
                placeholder="Golf Course Road, Gurgaon"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Full address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={property?.address ?? ""}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="propertyType">Type *</Label>
              <Select name="propertyType" defaultValue={property?.property_type ?? "apartment"}>
                <SelectTrigger id="propertyType" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                inputMode="numeric"
                min={0}
                required
                defaultValue={property?.price}
                className="h-11"
                placeholder="12500000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sizeSqft">Size (sqft)</Label>
              <Input
                id="sizeSqft"
                name="sizeSqft"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={property?.size_sqft ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrooms">Beds</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={property?.bedrooms ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Baths</Label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={property?.bathrooms ?? ""}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="floor">Floor</Label>
              <Input id="floor" name="floor" defaultValue={property?.floor ?? ""} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="furnishing">Furnishing</Label>
              <Select name="furnishing" defaultValue={property?.furnishing ?? undefined}>
                <SelectTrigger id="furnishing" className="h-11 w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FURNISHING_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="availability">Status</Label>
              <Select name="availability" defaultValue={property?.availability ?? "available"}>
                <SelectTrigger id="availability" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AVAILABILITY_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unitsAvailable">Units available</Label>
              <Input
                id="unitsAvailable"
                name="unitsAvailable"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={property?.units_available ?? 1}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="developerName">Developer</Label>
              <Input
                id="developerName"
                name="developerName"
                defaultValue={property?.developer_name ?? ""}
                className="h-11"
                placeholder="DLF Ltd"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input
                id="ownerName"
                name="ownerName"
                defaultValue={property?.owner_name ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerPhone">Owner phone</Label>
              <Input
                id="ownerPhone"
                name="ownerPhone"
                type="tel"
                inputMode="tel"
                defaultValue={property?.owner_phone ?? ""}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={property?.description ?? ""}
              placeholder="Premium 3BHK with club access, near metro…"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amenities">Amenities (comma separated)</Label>
              <Input
                id="amenities"
                name="amenities"
                defaultValue={property?.amenities?.join(", ") ?? ""}
                className="h-11"
                placeholder="Parking, Gym, Pool"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Internal tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={property?.tags?.join(", ") ?? ""}
                className="h-11"
                placeholder="featured, hot-deal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{property ? "Add more photos" : "Photos"}</Label>
            <ImageUploader orgId={orgId} />
          </div>

          {state.error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}

          <SubmitButton>{property ? "Save changes" : "Add property"}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
