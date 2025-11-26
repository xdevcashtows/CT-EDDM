const LOCKED_CAMPAIGN_STATUSES = new Set([
  'active',
  'in_production',
  'printed',
  'mailed'
]);

export const isCampaignStatusLockingRoute = (status) =>
  LOCKED_CAMPAIGN_STATUSES.has(status);

export const getLockedRouteIds = (campaigns = []) => {
  const lockedIds = new Set();
  (campaigns || []).forEach((campaign) => {
    if (campaign?.saved_route_id && isCampaignStatusLockingRoute(campaign.status)) {
      lockedIds.add(campaign.saved_route_id);
    }
  });
  return lockedIds;
};

export const enrichSavedRoutesWithLock = (routes = [], campaigns = []) => {
  const lockedRouteIds = getLockedRouteIds(campaigns);
  return (routes || []).map((route) => ({
    ...route,
    is_locked: lockedRouteIds.has(route.id)
  }));
};

