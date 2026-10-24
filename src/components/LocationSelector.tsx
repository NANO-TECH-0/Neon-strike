import { useEffect, useState } from "react";

export interface LocationSelection {
  countryCode: string;
  countryName: string;
  regionCode: string;
  regionName: string;
  cityName: string;
}

interface LocationSelectorProps {
  value?: Partial<LocationSelection>;
  onChange: (location: LocationSelection | null) => void;
}

interface LocationOption {
  code: string;
  name: string;
}

async function fetchOptions<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Could not load locations (${response.status}).`);
  return response.json() as Promise<T>;
}

export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState(value?.countryCode ?? "");
  const [regionCode, setRegionCode] = useState(value?.regionCode ?? "");
  const [cityName, setCityName] = useState(value?.cityName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchOptions<LocationOption[]>("/api/locations/countries")
      .then(options => {
        if (!controller.signal.aborted) setCountries(options);
      })
      .catch(loadError => {
        if (!controller.signal.aborted) setError(loadError.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setRegions([]);
    setCities([]);
    if (!countryCode) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchOptions<LocationOption[]>(`/api/locations/countries/${encodeURIComponent(countryCode)}/regions`)
      .then(options => {
        if (active) setRegions(options);
      })
      .catch(loadError => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [countryCode]);

  useEffect(() => {
    setCities([]);
    if (!countryCode || !regionCode) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchOptions<string[]>(
      `/api/locations/countries/${encodeURIComponent(countryCode)}/regions/${encodeURIComponent(regionCode)}/cities`
    )
      .then(options => {
        if (active) setCities(options);
      })
      .catch(loadError => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [countryCode, regionCode]);

  const country = countries.find(option => option.code === countryCode);
  const region = regions.find(option => option.code === regionCode);

  const publish = (nextCountry: string, nextRegion: string, nextCity: string) => {
    const selectedCountry = countries.find(option => option.code === nextCountry);
    const selectedRegion = regions.find(option => option.code === nextRegion);
    if (!selectedCountry || !selectedRegion || !nextCity) {
      onChange(null);
      return;
    }
    onChange({
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
      regionCode: selectedRegion.code,
      regionName: selectedRegion.name,
      cityName: nextCity
    });
  };

  const inputClass = "w-full rounded-lg border border-cyan-300/30 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-50";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-left text-xs text-slate-300">
        <span>País</span>
        <select
          value={countryCode}
          onChange={event => {
            setCountryCode(event.target.value);
            setRegionCode("");
            setCityName("");
            onChange(null);
          }}
          className={inputClass}
        >
          <option value="">Selecciona un país</option>
          {countries.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-left text-xs text-slate-300">
        <span>Región / estado</span>
        <select
          value={regionCode}
          disabled={!countryCode || loading}
          onChange={event => {
            setRegionCode(event.target.value);
            setCityName("");
            onChange(null);
          }}
          className={inputClass}
        >
          <option value="">Selecciona una región</option>
          {regions.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-left text-xs text-slate-300">
        <span>Ciudad</span>
        <select
          value={cityName}
          disabled={!regionCode || loading}
          onChange={event => {
            setCityName(event.target.value);
            publish(countryCode, regionCode, event.target.value);
          }}
          className={inputClass}
        >
          <option value="">Selecciona una ciudad</option>
          {cities.map((city, index) => <option key={`${city}-${index}`} value={city}>{city}</option>)}
        </select>
      </label>
      {loading && <p className="sm:col-span-3 text-xs text-cyan-200">Cargando ubicaciones…</p>}
      {error && <p role="alert" className="sm:col-span-3 text-xs text-red-300">{error}</p>}
      {country && region && cityName && (
        <p className="sm:col-span-3 text-xs text-slate-400">
          Ranking: {cityName}, {region.name}, {country.name}
        </p>
      )}
    </div>
  );
}
