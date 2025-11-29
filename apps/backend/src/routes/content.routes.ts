import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Content routes - restored from working version 39e0c7e
const router = Router();

/**
 * GET /api/content
 * Browse all content with pagination and filters
 *
 * Query params:
 * - genre: number (genre ID)
 * - year: number (exact year)
 * - yearMin/yearMax: number (year range)
 * - decade: number (e.g., 2010 for 2010-2019)
 * - ratingMin: number (minimum TMDB rating 0-10)
 * - director: string (partial match)
 * - actor: string (partial match in cast JSON)
 * - country: string (exact match)
 * - language: string (exact match)
 * - q: string (search title, description, director, cast)
 * - sort: string (year|rating|title|added|popular)
 * - order: string (asc|desc)
 * - watched: boolean (filter by user's watch status - requires auth)
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = 1; // Only show active content

    // Build dynamic where clause
    const where: any = { status };

    // Genre filter (existing)
    const genre = req.query.genre ? parseInt(req.query.genre as string) : undefined;
    if (genre !== undefined) {
      where.genre = genre;
    }

    // Year filters
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const yearMin = req.query.yearMin ? parseInt(req.query.yearMin as string) : undefined;
    const yearMax = req.query.yearMax ? parseInt(req.query.yearMax as string) : undefined;
    const decade = req.query.decade ? parseInt(req.query.decade as string) : undefined;

    if (year !== undefined) {
      where.year = year;
    } else if (decade !== undefined) {
      where.year = { gte: decade, lt: decade + 10 };
    } else if (yearMin !== undefined || yearMax !== undefined) {
      where.year = {};
      if (yearMin !== undefined) where.year.gte = yearMin;
      if (yearMax !== undefined) where.year.lte = yearMax;
    }

    // Rating filter
    const ratingMin = req.query.ratingMin ? parseFloat(req.query.ratingMin as string) : undefined;
    if (ratingMin !== undefined) {
      where.external_rating = { gte: ratingMin };
    }

    // Director filter (partial match)
    const director = req.query.director as string;
    if (director) {
      where.director = { contains: director, mode: 'insensitive' };
    }

    // Country filter
    const country = req.query.country as string;
    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }

    // Language filter
    const language = req.query.language as string;
    if (language) {
      where.language = language;
    }

    // Search query (title, description, director, cast)
    const searchQuery = req.query.q as string;
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { director: { contains: searchQuery, mode: 'insensitive' } },
        { cast: { contains: searchQuery, mode: 'insensitive' } },
        { plot: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Actor filter (search in cast JSON)
    const actor = req.query.actor as string;
    if (actor) {
      where.cast = { contains: actor, mode: 'insensitive' };
    }

    // Build dynamic orderBy
    const sortField = req.query.sort as string || 'popular';
    const sortOrder = (req.query.order as string || 'desc') === 'asc' ? 'asc' : 'desc';

    let orderBy: any[] = [];
    switch (sortField) {
      case 'year':
        orderBy = [{ year: sortOrder }, { created_at: 'desc' }];
        break;
      case 'rating':
        orderBy = [{ external_rating: sortOrder }, { created_at: 'desc' }];
        break;
      case 'title':
        orderBy = [{ title: sortOrder }];
        break;
      case 'added':
        orderBy = [{ created_at: sortOrder }];
        break;
      case 'runtime':
        orderBy = [{ runtime: sortOrder }, { created_at: 'desc' }];
        break;
      case 'popular':
      default:
        orderBy = [{ total_streams: 'desc' }, { created_at: 'desc' }];
        break;
    }

    // Get user's membership for watch status
    const userId = req.user?.userId;
    let userMembershipId: string | null = null;
    let watchedContentIds: Set<string> = new Set();

    if (userId) {
      const membership = await prisma.memberships.findFirst({
        where: { user_id: userId, is_active: true },
        select: { id: true },
      });
      userMembershipId = membership?.id || null;

      if (userMembershipId) {
        // Get all content IDs this user has watched
        const watches = await prisma.membership_watches.findMany({
          where: { membership_id: userMembershipId },
          select: { content_id: true, completion_rate: true },
        });
        watchedContentIds = new Set(watches.map(w => w.content_id));
      }
    }

    // Filter by watched status if requested
    const watchedFilter = req.query.watched as string;
    if (watchedFilter !== undefined && userMembershipId) {
      const watchedContentIdList = Array.from(watchedContentIds);
      if (watchedFilter === 'true') {
        // Only show watched content
        where.id = { in: watchedContentIdList };
      } else if (watchedFilter === 'false') {
        // Only show unwatched content
        where.id = { notIn: watchedContentIdList };
      }
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          uploader_profiles: {
            select: {
              id: true,
              user_id: true,
              users: {
                select: {
                  username: true,
                  wallet_address: true,
                },
              },
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.content.count({ where }),
    ]);

    // Convert BigInt fields to Numbers and normalize to camelCase for frontend
    const serializedContent = content.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      uploaderId: item.uploader_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      durationSeconds: item.duration_seconds,
      walrusBlobIds: item.walrus_blob_ids,
      thumbnailUrl: item.thumbnail_url,

      // TMDB Metadata
      tmdbId: item.tmdb_id,
      imdbId: item.imdb_id,
      originalTitle: item.original_title,
      year: item.year,
      plot: item.plot,
      runtime: item.runtime,
      tagline: item.tagline,
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
      genresList: item.genres_list,
      cast: item.cast,
      director: item.director,
      externalRating: item.external_rating,
      language: item.language,
      country: item.country,

      // Storage expiration
      storage_epochs: item.storage_epochs,
      storage_expires_at: item.storage_expires_at,

      status: item.status,
      totalStreams: Number(item.total_streams),
      totalWatchTime: Number(item.total_watch_time),
      averageCompletionRate: item.average_completion_rate,
      ratingSum: Number(item.rating_sum),
      ratingCount: Number(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at,

      // Per-user watch status
      watchedByUser: watchedContentIds.has(item.id),

      uploader: item.uploader_profiles ? {
        id: item.uploader_profiles.id,
        user: {
          username: item.uploader_profiles.users?.username,
          walletAddress: item.uploader_profiles.users?.wallet_address,
        },
      } : undefined,
    }));

    res.json({
      success: true,
      content: serializedContent,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Browse content error:', error);
    res.status(500).json({ error: 'Failed to browse content' });
  }
});

/**
 * GET /api/content/filters
 * Get available filter options based on actual content in the library
 */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    // Get distinct values from the database for each filterable field
    const [
      years,
      directors,
      countries,
      languages,
      genreContents,
    ] = await Promise.all([
      // Years (distinct, sorted desc)
      prisma.content.findMany({
        where: { status: 1, year: { not: null } },
        select: { year: true },
        distinct: ['year'],
        orderBy: { year: 'desc' },
      }),
      // Directors (distinct, sorted alpha)
      prisma.content.findMany({
        where: { status: 1, director: { not: null } },
        select: { director: true },
        distinct: ['director'],
        orderBy: { director: 'asc' },
      }),
      // Countries (distinct)
      prisma.content.findMany({
        where: { status: 1, country: { not: null } },
        select: { country: true },
        distinct: ['country'],
        orderBy: { country: 'asc' },
      }),
      // Languages (distinct)
      prisma.content.findMany({
        where: { status: 1, language: { not: null } },
        select: { language: true },
        distinct: ['language'],
        orderBy: { language: 'asc' },
      }),
      // Genres with counts
      prisma.content.groupBy({
        by: ['genre'],
        where: { status: 1 },
        _count: { genre: true },
        orderBy: { genre: 'asc' },
      }),
    ]);

    // Extract unique years and calculate decades
    const yearValues = years.map(y => y.year).filter(Boolean) as number[];
    const decadeSet = new Set(yearValues.map(y => Math.floor(y / 10) * 10));
    const decades = Array.from(decadeSet).sort((a, b) => b - a);

    // Genre mapping
    const GENRE_MAP: { [key: number]: string } = {
      1: 'Action',
      2: 'Comedy',
      3: 'Drama',
      4: 'Horror',
      5: 'Sci-Fi',
      6: 'Documentary',
      7: 'Thriller',
      8: 'Romance',
      9: 'Animation',
      10: 'Other',
    };

    const genres = genreContents.map(g => ({
      id: g.genre,
      name: GENRE_MAP[g.genre] || 'Unknown',
      count: g._count.genre,
    }));

    res.json({
      success: true,
      filters: {
        genres,
        years: yearValues,
        decades,
        directors: directors.map(d => d.director).filter(Boolean),
        countries: countries.map(c => c.country).filter(Boolean),
        languages: languages.map(l => l.language).filter(Boolean),
        sortOptions: [
          { value: 'popular', label: 'Most Popular' },
          { value: 'added', label: 'Recently Added' },
          { value: 'rating', label: 'Highest Rated' },
          { value: 'year', label: 'Release Year' },
          { value: 'title', label: 'Title (A-Z)' },
          { value: 'runtime', label: 'Runtime' },
        ],
      },
    });
  } catch (error) {
    logger.error('Get filters error:', error);
    res.status(500).json({ error: 'Failed to get filters' });
  }
});

/**
 * GET /api/content/categories
 * Get movies grouped by category for Netflix-style library
 *
 * Query params:
 * - categories: comma-separated list of category IDs
 *   Available categories:
 *   - recently_added: Last 20 movies added
 *   - popular: Most viewed (by total_streams)
 *   - highest_rated: 8+ rating
 *   - decade_2020s, decade_2010s, decade_2000s, decade_1990s, decade_1980s, decade_1970s
 *   - genre_action, genre_comedy, genre_drama, genre_horror, genre_scifi,
 *     genre_documentary, genre_thriller, genre_romance, genre_animation
 *   - unwatched: Per-user movies they haven't watched (requires auth)
 */
router.get('/categories', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const categoriesParam = req.query.categories as string || 'recently_added,popular,highest_rated,decade_1980s';
    const categoryIds = categoriesParam.split(',').map(c => c.trim());
    const limit = parseInt(req.query.limit as string) || 100; // Show all movies in category rows

    // Genre mapping
    const GENRE_MAP: { [key: string]: number } = {
      'genre_action': 1,
      'genre_comedy': 2,
      'genre_drama': 3,
      'genre_horror': 4,
      'genre_scifi': 5,
      'genre_documentary': 6,
      'genre_thriller': 7,
      'genre_romance': 8,
      'genre_animation': 9,
    };

    const GENRE_LABELS: { [key: string]: string } = {
      'genre_action': 'Action Movies',
      'genre_comedy': 'Comedies',
      'genre_drama': 'Drama',
      'genre_horror': 'Horror',
      'genre_scifi': 'Sci-Fi',
      'genre_documentary': 'Documentaries',
      'genre_thriller': 'Thrillers',
      'genre_romance': 'Romance',
      'genre_animation': 'Animation',
    };

    const DECADE_LABELS: { [key: string]: string } = {
      'decade_2020s': '2020s',
      'decade_2010s': '2010s',
      'decade_2000s': '2000s',
      'decade_1990s': '90s Classics',
      'decade_1980s': '80s Classics',
      'decade_1970s': '70s Classics',
    };

    // Get user's watched content IDs if authenticated
    const userId = req.user?.userId;
    let watchedContentIds: Set<string> = new Set();
    let userMembershipId: string | null = null;

    if (userId) {
      const membership = await prisma.memberships.findFirst({
        where: { user_id: userId, is_active: true },
        select: { id: true },
      });
      userMembershipId = membership?.id || null;

      if (userMembershipId) {
        const watches = await prisma.membership_watches.findMany({
          where: { membership_id: userMembershipId },
          select: { content_id: true },
        });
        watchedContentIds = new Set(watches.map(w => w.content_id));
      }
    }

    // Helper to serialize content
    const serializeContent = (items: any[]) => items.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      year: item.year,
      posterUrl: item.poster_url,
      thumbnailUrl: item.thumbnail_url,
      externalRating: item.external_rating,
      totalStreams: Number(item.total_streams),
      createdAt: item.created_at,
      watchedByUser: watchedContentIds.has(item.id),
    }));

    // Build category data
    const categories: any[] = [];

    for (const categoryId of categoryIds) {
      let where: any = { status: 1 };
      let orderBy: any[] = [];
      let label = '';

      // Handle different category types
      if (categoryId === 'recently_added') {
        label = 'Recently Added';
        orderBy = [{ created_at: 'desc' }];
      } else if (categoryId === 'popular') {
        label = 'Most Popular';
        orderBy = [{ total_streams: 'desc' }];
      } else if (categoryId === 'highest_rated') {
        label = 'Highest Rated';
        where.external_rating = { gte: 8 };
        orderBy = [{ external_rating: 'desc' }];
      } else if (categoryId.startsWith('decade_')) {
        label = DECADE_LABELS[categoryId] || categoryId;
        const decadeStr = categoryId.replace('decade_', '').replace('s', '');
        const decade = parseInt(decadeStr.length === 2 ? '19' + decadeStr : decadeStr);
        where.year = { gte: decade, lt: decade + 10 };
        orderBy = [{ external_rating: 'desc' }, { total_streams: 'desc' }];
      } else if (categoryId.startsWith('genre_')) {
        label = GENRE_LABELS[categoryId] || categoryId;
        const genreId = GENRE_MAP[categoryId];
        if (genreId) {
          where.genre = genreId;
          orderBy = [{ total_streams: 'desc' }];
        }
      } else if (categoryId === 'unwatched' && userMembershipId) {
        label = 'Unwatched';
        const watchedIds = Array.from(watchedContentIds);
        if (watchedIds.length > 0) {
          where.id = { notIn: watchedIds };
        }
        orderBy = [{ created_at: 'desc' }];
      } else {
        // Unknown category, skip
        continue;
      }

      // Fetch movies for this category
      const [movies, totalCount] = await Promise.all([
        prisma.content.findMany({
          where,
          orderBy,
          take: limit,
        }),
        prisma.content.count({ where }),
      ]);

      categories.push({
        id: categoryId,
        label,
        movies: serializeContent(movies),
        totalCount,
      });
    }

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

/**
 * GET /api/content/category/:categoryId
 * Get all movies for a specific category with pagination (for "See All")
 */
router.get('/category/:categoryId', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Genre mapping
    const GENRE_MAP: { [key: string]: number } = {
      'genre_action': 1,
      'genre_comedy': 2,
      'genre_drama': 3,
      'genre_horror': 4,
      'genre_scifi': 5,
      'genre_documentary': 6,
      'genre_thriller': 7,
      'genre_romance': 8,
      'genre_animation': 9,
    };

    const GENRE_LABELS: { [key: string]: string } = {
      'genre_action': 'Action Movies',
      'genre_comedy': 'Comedies',
      'genre_drama': 'Drama',
      'genre_horror': 'Horror',
      'genre_scifi': 'Sci-Fi',
      'genre_documentary': 'Documentaries',
      'genre_thriller': 'Thrillers',
      'genre_romance': 'Romance',
      'genre_animation': 'Animation',
    };

    const DECADE_LABELS: { [key: string]: string } = {
      'decade_2020s': '2020s',
      'decade_2010s': '2010s',
      'decade_2000s': '2000s',
      'decade_1990s': '90s Classics',
      'decade_1980s': '80s Classics',
      'decade_1970s': '70s Classics',
    };

    // Get user's watched content IDs
    const userId = req.user?.userId;
    let watchedContentIds: Set<string> = new Set();
    let userMembershipId: string | null = null;

    if (userId) {
      const membership = await prisma.memberships.findFirst({
        where: { user_id: userId, is_active: true },
        select: { id: true },
      });
      userMembershipId = membership?.id || null;

      if (userMembershipId) {
        const watches = await prisma.membership_watches.findMany({
          where: { membership_id: userMembershipId },
          select: { content_id: true },
        });
        watchedContentIds = new Set(watches.map(w => w.content_id));
      }
    }

    // Build query based on category
    let where: any = { status: 1 };
    let orderBy: any[] = [];
    let label = '';

    if (categoryId === 'recently_added') {
      label = 'Recently Added';
      orderBy = [{ created_at: 'desc' }];
    } else if (categoryId === 'popular') {
      label = 'Most Popular';
      orderBy = [{ total_streams: 'desc' }];
    } else if (categoryId === 'highest_rated') {
      label = 'Highest Rated';
      where.external_rating = { gte: 8 };
      orderBy = [{ external_rating: 'desc' }];
    } else if (categoryId.startsWith('decade_')) {
      label = DECADE_LABELS[categoryId] || categoryId;
      const decadeStr = categoryId.replace('decade_', '').replace('s', '');
      const decade = parseInt(decadeStr.length === 2 ? '19' + decadeStr : decadeStr);
      where.year = { gte: decade, lt: decade + 10 };
      orderBy = [{ external_rating: 'desc' }, { total_streams: 'desc' }];
    } else if (categoryId.startsWith('genre_')) {
      label = GENRE_LABELS[categoryId] || categoryId;
      const genreId = GENRE_MAP[categoryId];
      if (genreId) {
        where.genre = genreId;
        orderBy = [{ total_streams: 'desc' }];
      }
    } else if (categoryId === 'unwatched' && userMembershipId) {
      label = 'Unwatched';
      const watchedIds = Array.from(watchedContentIds);
      if (watchedIds.length > 0) {
        where.id = { notIn: watchedIds };
      }
      orderBy = [{ created_at: 'desc' }];
    } else {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const [movies, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.content.count({ where }),
    ]);

    const serializedMovies = movies.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      year: item.year,
      posterUrl: item.poster_url,
      thumbnailUrl: item.thumbnail_url,
      externalRating: item.external_rating,
      totalStreams: Number(item.total_streams),
      createdAt: item.created_at,
      watchedByUser: watchedContentIds.has(item.id),
    }));

    res.json({
      success: true,
      category: {
        id: categoryId,
        label,
        movies: serializedMovies,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to get category' });
  }
});

/**
 * GET /api/content/available-categories
 * Get list of all available categories for the category picker
 */
router.get('/available-categories', async (req: Request, res: Response) => {
  try {
    // Get content counts for each category type
    const [
      totalCount,
      highRatedCount,
      decadeCounts,
      genreCounts,
    ] = await Promise.all([
      prisma.content.count({ where: { status: 1 } }),
      prisma.content.count({ where: { status: 1, external_rating: { gte: 8 } } }),
      // Get decade counts
      prisma.content.groupBy({
        by: ['year'],
        where: { status: 1, year: { not: null } },
        _count: true,
      }),
      // Get genre counts
      prisma.content.groupBy({
        by: ['genre'],
        where: { status: 1 },
        _count: true,
      }),
    ]);

    // Calculate decade counts
    const decadeMap: { [key: number]: number } = {};
    decadeCounts.forEach((d: any) => {
      if (d.year) {
        const decade = Math.floor(d.year / 10) * 10;
        decadeMap[decade] = (decadeMap[decade] || 0) + d._count;
      }
    });

    // Genre mapping
    const GENRE_NAMES: { [key: number]: string } = {
      1: 'Action Movies',
      2: 'Comedies',
      3: 'Drama',
      4: 'Horror',
      5: 'Sci-Fi',
      6: 'Documentaries',
      7: 'Thrillers',
      8: 'Romance',
      9: 'Animation',
    };

    const categories = [
      { id: 'recently_added', label: 'Recently Added', count: totalCount, group: 'general' },
      { id: 'popular', label: 'Most Popular', count: totalCount, group: 'general' },
      { id: 'highest_rated', label: 'Highest Rated', count: highRatedCount, group: 'general' },
    ];

    // Add decades
    const decades = Object.keys(decadeMap).map(Number).sort((a, b) => b - a);
    decades.forEach(decade => {
      const decadeLabel = decade >= 2000 ? `${decade}s` : `${decade.toString().slice(2)}s Classics`;
      categories.push({
        id: `decade_${decade}s`,
        label: decadeLabel,
        count: decadeMap[decade],
        group: 'decade',
      });
    });

    // Add genres
    genreCounts.forEach((g: any) => {
      const genreName = GENRE_NAMES[g.genre];
      if (genreName) {
        const genreKey = genreName.toLowerCase().replace(/\s+/g, '_').replace('_movies', '');
        categories.push({
          id: `genre_${genreKey === 'action' ? 'action' : genreKey}`,
          label: genreName,
          count: g._count,
          group: 'genre',
        });
      }
    });

    // Add unwatched (requires auth, count shown as 0 if not authenticated)
    categories.push({ id: 'unwatched', label: 'Unwatched', count: 0, group: 'personal' });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    logger.error('Get available categories error:', error);
    res.status(500).json({ error: 'Failed to get available categories' });
  }
});

/**
 * GET /api/content/:id
 * Get content details by ID
 */
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        uploader_profiles: {
          select: {
            id: true,
            user_id: true,
            users: {
              select: {
                id: true,
                username: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Calculate average rating
    const averageRating = content.rating_count > 0
      ? Number(content.rating_sum) / Number(content.rating_count)
      : 0;

    res.json({
      success: true,
      content: {
        id: content.id,
        blockchainId: content.blockchain_id,
        uploaderId: content.uploader_id,
        title: content.title,
        description: content.description,
        genre: content.genre,
        durationSeconds: content.duration_seconds,
        walrusBlobIds: content.walrus_blob_ids,
        thumbnailUrl: content.thumbnail_url,

        // TMDB Metadata
        tmdbId: content.tmdb_id,
        imdbId: content.imdb_id,
        originalTitle: content.original_title,
        year: content.year,
        plot: content.plot,
        runtime: content.runtime,
        tagline: content.tagline,
        posterUrl: content.poster_url,
        backdropUrl: content.backdrop_url,
        genresList: content.genres_list,
        cast: content.cast,
        director: content.director,
        externalRating: content.external_rating,
        language: content.language,
        country: content.country,

        // Storage expiration
        storage_epochs: content.storage_epochs,
        storage_expires_at: content.storage_expires_at,

        status: content.status,
        totalStreams: Number(content.total_streams),
        totalWatchTime: Number(content.total_watch_time),
        averageCompletionRate: content.average_completion_rate,
        ratingSum: Number(content.rating_sum),
        ratingCount: Number(content.rating_count),
        averageRating: averageRating.toFixed(1),
        createdAt: content.created_at,
        updatedAt: content.updated_at,
        uploader: {
          id: content.uploader_profiles.id,
          username: content.uploader_profiles.users.username,
          avatarUrl: content.uploader_profiles.users.avatar_url,
        },
      },
    });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

/**
 * GET /api/content/search?q=query
 * Search content by title or description
 */
router.get('/search', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const content = await prisma.content.findMany({
      where: {
        status: 1, // Only active content
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        uploader_profiles: {
          select: {
            id: true,
            users: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        total_streams: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.content.count({
      where: {
        status: 1,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    // Normalize to camelCase for frontend
    const normalizedResults = content.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      uploaderId: item.uploader_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      durationSeconds: item.duration_seconds,
      walrusBlobIds: item.walrus_blob_ids,
      thumbnailUrl: item.thumbnail_url,
      status: item.status,
      totalStreams: Number(item.total_streams),
      totalWatchTime: Number(item.total_watch_time),
      averageCompletionRate: item.average_completion_rate,
      ratingSum: Number(item.rating_sum),
      ratingCount: Number(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      uploader: item.uploader_profiles ? {
        id: item.uploader_profiles.id,
        username: item.uploader_profiles.users?.username,
      } : undefined,
    }));

    res.json({
      success: true,
      results: normalizedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Search content error:', error);
    res.status(500).json({ error: 'Failed to search content' });
  }
});

/**
 * GET /api/content/featured
 * Get featured content
 */
router.get('/featured', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.findMany({
      where: {
        status: 1, // Active content
        average_completion_rate: {
          gte: 70, // High completion rate
        },
      },
      include: {
        uploader_profiles: {
          select: {
            users: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: [
        { total_streams: 'desc' },
        { average_completion_rate: 'desc' },
      ],
      take: 10,
    });

    // Normalize to camelCase for frontend
    const normalizedContent = content.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      uploaderId: item.uploader_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      durationSeconds: item.duration_seconds,
      walrusBlobIds: item.walrus_blob_ids,
      thumbnailUrl: item.thumbnail_url,
      status: item.status,
      totalStreams: Number(item.total_streams),
      totalWatchTime: Number(item.total_watch_time),
      averageCompletionRate: item.average_completion_rate,
      ratingSum: Number(item.rating_sum),
      ratingCount: Number(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      uploader: item.uploader_profiles ? {
        username: item.uploader_profiles.users?.username,
      } : undefined,
    }));

    res.json({
      success: true,
      content: normalizedContent,
    });
  } catch (error) {
    logger.error('Get featured content error:', error);
    res.status(500).json({ error: 'Failed to get featured content' });
  }
});

export default router;
