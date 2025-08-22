import { useState, useEffect, useCallback } from 'react';
import { goalsApi, Objective, ObjectiveCreate, KeyResult, KeyResultUpdate } from '../api/goalsApi';

interface UseGoalsOptions {
  quarter?: string;
  year?: number;
  type?: string;
  autoLoad?: boolean;
}

export const useGoals = (options: UseGoalsOptions = {}) => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadObjectives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await goalsApi.getObjectives({
        quarter: options.quarter,
        year: options.year,
        type: options.type
      });
      setObjectives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load objectives');
    } finally {
      setLoading(false);
    }
  }, [options.quarter, options.year, options.type]);

  useEffect(() => {
    if (options.autoLoad !== false) {
      loadObjectives();
    }
  }, [loadObjectives, options.autoLoad]);

  const createObjective = async (data: ObjectiveCreate) => {
    try {
      setLoading(true);
      const newObjective = await goalsApi.createObjective(data);
      setObjectives([...objectives, newObjective]);
      return newObjective;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create objective');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateObjective = async (id: number, data: Partial<ObjectiveCreate>) => {
    try {
      setLoading(true);
      const updatedObjective = await goalsApi.updateObjective(id, data);
      setObjectives(objectives.map(obj => 
        obj.id === id ? updatedObjective : obj
      ));
      return updatedObjective;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update objective');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteObjective = async (id: number) => {
    try {
      setLoading(true);
      await goalsApi.deleteObjective(id);
      setObjectives(objectives.filter(obj => obj.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete objective');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateKeyResultProgress = async (keyResultId: number, update: KeyResultUpdate) => {
    try {
      const updatedKeyResult = await goalsApi.updateKeyResultProgress(keyResultId, update);
      
      // Update the objectives state to reflect the change
      setObjectives(objectives.map(obj => ({
        ...obj,
        keyResults: obj.keyResults?.map(kr => 
          kr.id === keyResultId ? updatedKeyResult : kr
        )
      })));
      
      return updatedKeyResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key result');
      throw err;
    }
  };

  return {
    objectives,
    loading,
    error,
    refetch: loadObjectives,
    createObjective,
    updateObjective,
    deleteObjective,
    updateKeyResultProgress
  };
};