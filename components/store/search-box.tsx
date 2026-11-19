'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';
import { formatNaira } from '@/lib/services/store/types';

type Suggestion = { slug: string; title: string; priceKobo: number; imageUrl: string };

export function SearchBox({ initialQuery = '', onSearch }: { initialQuery?: string; onSearch?: (query: string) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  useEffect(() => {
    const term = query.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (term.length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => {
      apiRequest<{ suggestions: Suggestion[] }>(`/api/store/search/suggest?q=${encodeURIComponent(term)}`)
        .then(data => { setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []); setOpen(true); })
        .catch(() => { setSuggestions([]); setOpen(false); });
    }, 300);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (boxRef.current && event.target instanceof Node && !boxRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => { document.removeEventListener('mousedown', handlePointerDown); document.removeEventListener('touchstart', handlePointerDown); };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    setOpen(false);
    if (!term) return;
    if (onSearch) onSearch(term);
    else router.push(`/store/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <div className="search-box" ref={boxRef}>
      <form role="search" onSubmit={submit}>
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search scrubs, devices, books, and kits"
          aria-label="Search the store"
          autoComplete="off"
        />
        <button type="submit" className="button small" aria-label="Search"><Search size={16} aria-hidden="true" /></button>
      </form>
      {open && suggestions.length > 0 && (
        <ul className="search-suggestions" aria-label="Search suggestions">
          {suggestions.map(suggestion => (
            <li key={suggestion.slug}>
              <button
                type="button"
                className="search-suggestion-item"
                onClick={() => { setOpen(false); router.push(`/store/listing/${suggestion.slug}`); }}
              >
                <img src={suggestion.imageUrl || '/dtechnurse-logo.jpg'} alt="" loading="lazy" />
                <span className="mini-card-title">{suggestion.title}</span>
                <span className="mini-card-price">{formatNaira(suggestion.priceKobo)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
