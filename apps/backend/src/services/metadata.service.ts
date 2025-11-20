import axios from 'axios';
import { logger } from '../utils/logger';

export interface MovieMetadata {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  year?: number;
  plot?: string;
  runtime?: number; // minutes
  posterUrl?: string;
  backdropUrl?: string;
  genres?: string[]; // ["Action", "Sci-Fi"]
  cast?: Array<{ name: string; character: string; profilePath?: string }>;
  director?: string;
  rating?: number; // 0-10
  language?: string;
  country?: string;
  tagline?: string;
}

export class MetadataService {
  private tmdbApiKey: string;
  private tmdbReadToken: string;
  private tmdbBaseUrl = 'https://api.themoviedb.org/3';
  private imageBaseUrl = 'https://image.tmdb.org/t/p/original';

  constructor() {
    this.tmdbApiKey = process.env.TMDB_API_KEY!;
    this.tmdbReadToken = process.env.TMDB_READ_TOKEN!;

    if (!this.tmdbApiKey && !this.tmdbReadToken) {
      logger.warn('TMDB credentials not set - metadata enrichment disabled');
    } else {
      logger.info('TMDB metadata service initialized');
    }
  }

  /**
   * Check if TMDB is configured
   */
  isEnabled(): boolean {
    return !!(this.tmdbApiKey || this.tmdbReadToken);
  }

  /**
   * Search for movie by title
   * Returns top match or null
   */
  async searchMovie(title: string, year?: number): Promise<MovieMetadata | null> {
    if (!this.isEnabled()) {
      logger.warn('TMDB not configured, skipping metadata search');
      return null;
    }

    try {
      logger.info('Searching TMDB for movie', { title, year });

      const params: any = {
        query: title,
        include_adult: false,
        language: 'en-US',
        page: 1,
      };

      if (year) {
        params.year = year;
      }

      // Use Read Access Token (Bearer auth) if available, otherwise API Key
      const headers = this.tmdbReadToken
        ? { Authorization: `Bearer ${this.tmdbReadToken}` }
        : {};

      const searchUrl = this.tmdbReadToken
        ? `${this.tmdbBaseUrl}/search/movie`
        : `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}`;

      const response = await axios.get(searchUrl, {
        params: this.tmdbReadToken ? params : { ...params, api_key: this.tmdbApiKey },
        headers,
        timeout: 10000,
      });

      if (!response.data.results || response.data.results.length === 0) {
        logger.info(`No TMDB results found for: ${title}`);
        return null;
      }

      // Get top result
      const movie = response.data.results[0];
      logger.info(`Found TMDB match: ${movie.title} (${movie.release_date?.substring(0, 4)})`, {
        tmdbId: movie.id,
        confidence: movie.vote_count > 100 ? 'high' : 'low',
      });

      // Fetch detailed info (cast, crew, etc.)
      const details = await this.getMovieDetails(movie.id);

      return details;
    } catch (error: any) {
      logger.error('Failed to search movie metadata', {
        title,
        error: error.message,
        status: error.response?.status,
      });
      return null;
    }
  }

  /**
   * Get detailed movie info by TMDB ID
   */
  async getMovieDetails(tmdbId: number): Promise<MovieMetadata> {
    const headers = this.tmdbReadToken
      ? { Authorization: `Bearer ${this.tmdbReadToken}` }
      : {};

    const apiKeyParam = this.tmdbReadToken ? {} : { api_key: this.tmdbApiKey };

    const [movieData, creditsData] = await Promise.all([
      axios.get(`${this.tmdbBaseUrl}/movie/${tmdbId}`, {
        params: apiKeyParam,
        headers,
        timeout: 10000,
      }),
      axios.get(`${this.tmdbBaseUrl}/movie/${tmdbId}/credits`, {
        params: apiKeyParam,
        headers,
        timeout: 10000,
      }),
    ]);

    const movie = movieData.data;
    const credits = creditsData.data;

    return {
      tmdbId: movie.id,
      imdbId: movie.imdb_id,
      title: movie.title,
      originalTitle: movie.original_title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      plot: movie.overview,
      runtime: movie.runtime,
      tagline: movie.tagline,
      posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
      backdropUrl: movie.backdrop_path ? `${this.imageBaseUrl}${movie.backdrop_path}` : undefined,
      genres: movie.genres?.map((g: any) => g.name),
      cast: credits.cast?.slice(0, 15).map((c: any) => ({
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `${this.imageBaseUrl}${c.profile_path}` : undefined,
      })),
      director: credits.crew?.find((c: any) => c.job === 'Director')?.name,
      rating: movie.vote_average,
      language: movie.original_language,
      country: movie.production_countries?.[0]?.iso_3166_1,
    };
  }

  /**
   * Smart title extraction from filename
   * Examples:
   *   "Inception.2010.1080p.BluRay.x264.mp4" → { title: "Inception", year: 2010 }
   *   "The.Dark.Knight.mp4" → { title: "The Dark Knight" }
   *   "avatar_2009.mkv" → { title: "Avatar", year: 2009 }
   *   "Fight.Club.10th.Anniversary.Edition.1999.1080p.BrRip.x264.YIFY.mp4" → { title: "Fight Club", year: 1999 }
   */
  parseFilename(filename: string): { title: string; year?: number } {
    // Remove extension
    let name = filename.replace(/\.(mp4|mkv|avi|mov|webm|flv|wmv)$/i, '');

    // Extract year (4 digits between 1900-2099)
    const yearMatch = name.match(/[.\s_-](19\d{2}|20\d{2})(?:[.\s_-]|$)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    // Remove release group names (usually at the end)
    name = name.replace(/[.\s_-](YIFY|YTS|RARBG|ETRG|FGT|SPARKS|FLEET|GalaxyRG|PSA|EVO|ION10|CMRG)$/gi, '');

    // Remove edition/special release text
    name = name.replace(/[.\s_-](\d+th|\d+st|\d+nd|\d+rd)[.\s_-]?(Anniversary|Edition)/gi, ' ');
    name = name.replace(/[.\s_-](Extended|Unrated|Directors?[.\s_-]Cut|Special[.\s_-]Edition|Remastered|Theatrical|Ultimate|Collectors?|Limited)/gi, ' ');

    // Remove quality/source indicators
    name = name.replace(/[.\s_-](480p|720p|1080p|2160p|4k|uhd|hd)/gi, ' ');
    name = name.replace(/[.\s_-](BluRay|Blu-Ray|BrRip|BDRip|DVDRip|WEBRip|WEB-DL|HDTV|HDRip|CAM|TS|TC)/gi, ' ');

    // Remove codec/encoding info
    name = name.replace(/[.\s_-](x264|x265|h264|h265|HEVC|10bit|8bit)/gi, ' ');
    name = name.replace(/[.\s_-](AAC|AC3|DTS|MP3|DD5\.1|Atmos)/gi, ' ');

    // Remove year from title
    if (year) {
      name = name.replace(new RegExp(`[.\\s_-]${year}(?:[.\\s_-]|$)`, 'g'), ' ');
    }

    // Replace dots, underscores, dashes with spaces
    name = name.replace(/[._-]/g, ' ');

    // Collapse multiple spaces
    name = name.replace(/\s+/g, ' ').trim();

    logger.info('Parsed filename', { filename, parsed: name, year });

    return { title: name, year };
  }

  /**
   * Search with multiple fallback strategies
   * 1. Try with year (if available)
   * 2. Try without year
   * 3. Try with cleaned title (remove articles, special chars)
   */
  async searchMovieWithFallbacks(filename: string): Promise<MovieMetadata | null> {
    const parsed = this.parseFilename(filename);

    // Strategy 1: Search with year
    if (parsed.year) {
      const result = await this.searchMovie(parsed.title, parsed.year);
      if (result) return result;

      logger.info('No match with year, trying without year...');
    }

    // Strategy 2: Search without year
    const result = await this.searchMovie(parsed.title);
    if (result) return result;

    // Strategy 3: Clean title (remove articles)
    const cleanedTitle = parsed.title
      .replace(/^(The|A|An)\s+/i, '')
      .trim();

    if (cleanedTitle !== parsed.title) {
      logger.info('Trying cleaned title', { original: parsed.title, cleaned: cleanedTitle });
      const cleanedResult = await this.searchMovie(cleanedTitle, parsed.year);
      if (cleanedResult) return cleanedResult;
    }

    logger.warn('No TMDB match found after all fallback attempts', { filename });
    return null;
  }
}

// Singleton
let metadataServiceInstance: MetadataService | null = null;

export function getMetadataService(): MetadataService {
  if (!metadataServiceInstance) {
    metadataServiceInstance = new MetadataService();
  }
  return metadataServiceInstance;
}
