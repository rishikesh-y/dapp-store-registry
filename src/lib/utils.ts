import { OpenSearchCompositeQuery, PaginationQuery } from '../interfaces';

export class cloneable {
  public static deepCopy<T>(source: T): T {
    return Array.isArray(source)
      ? source.map(item => this.deepCopy(item))
      : source instanceof Date
      ? new Date(source.getTime())
      : source && typeof source === "object"
      ? Object.getOwnPropertyNames(source).reduce((o, prop) => {
          Object.defineProperty(
            o,
            prop,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Object.getOwnPropertyDescriptor(source, prop)!
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          o[prop] = this.deepCopy((source as { [key: string]: any })[prop]);
          return o;
        }, Object.create(Object.getPrototypeOf(source)))
      : (source as T);
  }
}

export const recordsPerPage: number = 20;

export const searchFilters = (search:string, payload:any): PaginationQuery => {
  const query: OpenSearchCompositeQuery = {
    bool: {
        must: [],
        must_not: [],
        should: []
    }
  }
  const {
    isForMatureAudience = null,
    minAge = null,
    chainId = null,
    language = null,
    availableOnPlatform = null,
    listedOnOrAfter = null,
    listedOnOrBefore = null,
    allowedInCountries = null,
    blockedInCountries = null,
    categories = null,
    isListed = false,
    developer = null,
    page = 1,
    dappId = null
  } = payload

  if (!!isForMatureAudience) query.bool.must.push({match: { isForMatureAudience: isForMatureAudience ==='true' ? true : false } });
  if (minAge) query.bool.must.push({range: { minAge: { gte: minAge }}});
  if (chainId) query.bool.must.push({match: { chains: chainId}});
  if (language) query.bool.must.push({match: { language}});
  if (availableOnPlatform) query.bool.must.push({match: { availableOnPlatform: availableOnPlatform}});
  if (listedOnOrAfter) query.bool.must.push({range: { listDate: { gte: listedOnOrAfter } }});
  if (listedOnOrBefore) query.bool.must.push({range: { listDate: { lte: listedOnOrBefore } }});

  // it should be filter users location current not more then one country
  if (blockedInCountries && allowedInCountries.length) {
    allowedInCountries.split(',').forEach((ac:string)=> {
      query.bool.should.push({term: { "geoRestrictions.allowedCountries": ac.trim() }});
    })
  }
  // it should be filter users location current not more then one country
  if (blockedInCountries && blockedInCountries.length) {
    blockedInCountries.split(',').forEach((bc:string)=> {
      query.bool.must_not.push({term: { "geoRestrictions.blockedInCountries": bc.trim() }});
    })
  }
  if (isListed) query.bool.must.push({match: { isListed:  isListed === 'true' ? true: false }});
  if (developer && developer.githubID) query.bool.must.push({match: { "developer.githubID":  developer.githubID.trim() }});
  if (categories && categories.length) query.bool.must.push({terms: { category: categories.split(',').map((cat: string) => cat.trim()) }});
  if (dappId) query.bool.must.push({term: { id: dappId.trim() }})

  // search on customer string
  if (!!search && search.length) {
    query.bool.should.push({ match: { name: { query: search, operator: "and" } } })
    query.bool.should.push({ match: { description: { query: search, operator: "and" } } })
    query.bool.should.push({ match: { daapId: { query: search, operator: "and" } } })
  }

  payload.page = parseInt(page);
  payload.page = payload.page > 0 ? payload.page: 1;
  
  const finalQuery: PaginationQuery = {
    query,
    from: (payload.page-1) * recordsPerPage,
    size: payload.page * recordsPerPage,
    sort: [{ _score: { order: "desc" }}]
  }

  return finalQuery;
}
