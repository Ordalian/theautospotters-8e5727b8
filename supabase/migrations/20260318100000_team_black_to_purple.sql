-- Replace team "black" with "purple" everywhere (World Domination teams)
UPDATE public.profiles SET team_color = 'purple' WHERE team_color = 'black';
UPDATE public.map_pois SET owner_team = 'purple' WHERE owner_team = 'black';
UPDATE public.poi_battles SET winner_team = 'purple' WHERE winner_team = 'black';
UPDATE public.poi_battle_cards SET team_color = 'purple' WHERE team_color = 'black';
