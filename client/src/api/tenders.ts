import api from 'api';

export const getTenders = () => api.get('/tenders').then((response) => response.data);
export const addTender = (tenderData: any) => api.post('/tenders', tenderData).then((response) => response.data);
export const updateTender = (id: number, tenderData: any) => api.put(`/tenders/${id}`, tenderData).then((response) => response.data);
export const deleteTender = (id: number) => api.delete(`/tenders/${id}`).then((response) => response.data);
export const getTenderBudget = (tenderId: number) => api.get(`/tenders/${tenderId}/budget`).then((response) => response.data);
export const getHeaderNote = () => api.get('/tenders/header-note').then((response) => response.data);
export const saveHeaderNote = (content: string) => api.post('/tenders/header-note', { content }).then((response) => response.data);