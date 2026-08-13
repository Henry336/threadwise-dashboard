"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, LoaderCircle, MapPin, Search } from "lucide-react";
import type { StudyPlace } from "@/lib/study-types";

type Props = {
  value: string;
  placeId?: string | null;
  onChange: (value: string, placeId: string | null) => void;
  label?: string;
  optional?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function StudyPlaceCombobox({
  value,
  placeId,
  onChange,
  label = "Destination",
  optional = false,
  placeholder = "Search NUS venues or bus stops",
  required = false,
  disabled = false,
}: Props) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [places, setPlaces] = useState<StudyPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = value.trim();

  useEffect(() => {
    if (query.length < 2 || placeId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/threadwise/study/places?q=${encodeURIComponent(query)}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Place search failed.");
        const payload = await response.json() as { places?: StudyPlace[] };
        setPlaces(payload.places ?? []);
        setOpen(true);
        setActiveIndex((payload.places?.length ?? 0) ? 0 : -1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setPlaces([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [placeId, query]);

  const choose = (place: StudyPlace) => {
    onChange(place.displayName, place.id);
    setOpen(false);
    setPlaces([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };
  const venues = places.map((place, index) => ({ place, index })).filter(({ place }) => place.kind === "venue");
  const stops = places.map((place, index) => ({ place, index })).filter(({ place }) => place.kind === "stop");

  return <label className="study-place-field">
    <span>{label}{optional && <i>optional</i>}</span>
    <div className="study-place-combobox">
      <Search size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && query.length >= 2}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => { if (places.length || query.length >= 2) setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value, null);
          setPlaces([]);
          setLoading(false);
          setActiveIndex(-1);
          setOpen(event.target.value.trim().length >= 2);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(places.length - 1, current + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(0, current - 1));
          } else if (event.key === "Enter" && open && activeIndex >= 0 && places[activeIndex]) {
            event.preventDefault();
            choose(places[activeIndex]!);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && <LoaderCircle className="study-place-spinner" size={16} aria-label="Searching places" />}
      {open && query.length >= 2 && !loading && <div id={listboxId} className="study-place-options" role="listbox" aria-label="NUS places">
        {!places.length && <p>No matching NUS places.</p>}
        {venues.length > 0 && <PlaceGroup title="Venues" icon={Building2} entries={venues} listboxId={listboxId} activeIndex={activeIndex} onChoose={choose} />}
        {stops.length > 0 && <PlaceGroup title="Bus stops" icon={MapPin} entries={stops} listboxId={listboxId} activeIndex={activeIndex} onChoose={choose} />}
      </div>}
    </div>
    {query && !placeId && <small className="study-place-warning">Pick a valid location from the list to enable leave-time reminders. You can still save this as a venue label.</small>}
  </label>;
}

function PlaceGroup({ title, icon: Icon, entries, listboxId, activeIndex, onChoose }: {
  title: string;
  icon: typeof MapPin;
  entries: Array<{ place: StudyPlace; index: number }>;
  listboxId: string;
  activeIndex: number;
  onChoose: (place: StudyPlace) => void;
}) {
  return <section aria-label={title}>
    <h4><Icon size={13} /> {title}</h4>
    {entries.map(({ place, index }) => <button
      key={place.id}
      id={`${listboxId}-${index}`}
      type="button"
      role="option"
      aria-selected={index === activeIndex}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChoose(place)}
    >
      <span><b>{place.displayName}</b><small>{place.subtitle || place.aliases.slice(0, 2).join(" / ")}</small></span>
      {place.nearbyStops[0] && <em title={`From ${place.nearbyStops[0].title}`}>
        {place.kind === "venue"
          ? place.nearbyStops[0].walkMinutes
            ? `Final walk: ${place.nearbyStops[0].walkMinutes} min`
            : "At destination stop"
          : "Bus stop"}
      </em>}
    </button>)}
  </section>;
}

export function scheduleBlockPlaceId(block: { venueId?: string | null; destinationStopId?: string | null }) {
  if (block.venueId) return /^(?:venue|stop):/.test(block.venueId) ? block.venueId : `venue:${block.venueId}`;
  return block.destinationStopId ? `stop:${block.destinationStopId}` : null;
}
