import type { LikeReceivedOut, LikeStateResponse, VisitorOut, RelationshipResponse, BlockStateResponse, OkResponse, BlockedUserOut } from "@/types/social";
import { apiDelete, apiGet, apiPost } from "./client";
import { toQueryString } from "./discovery";
import type { BasicQueryParamsValues } from "@/schemas/discovery";
import type { reportInputValue } from "@/schemas/social";

export async function postLike(
    token: string,
    target_user_id: number
): Promise<LikeStateResponse> {
    return apiPost<LikeStateResponse>(`/social/likes/${target_user_id}`, undefined, {token})
}

export async function postUnLike(
    token: string,
    target_user_id: number
): Promise<LikeStateResponse> {
    return apiDelete<LikeStateResponse>(`/social/likes/${target_user_id}`, {token})
}

export async function getRelationship(
    token: string,
    target_user_id: number
): Promise<RelationshipResponse> {
    return apiGet<RelationshipResponse>(`/social/relationship/${target_user_id}`, {token})
}

export async function getLikesReceivedList(
    token: string,
    params: BasicQueryParamsValues
): Promise<LikeReceivedOut[]> {
    return apiGet<LikeReceivedOut[]>(`/social/likes/received${toQueryString(params)}`, {token})
}

export async function getVisitorsList(
    token: string,
    params: BasicQueryParamsValues
): Promise<VisitorOut[]> {
    return apiGet<VisitorOut[]>(`/social/visitors${toQueryString(params)}`, {token})
}

export async function getBlockList(
    token: string,
    params: BasicQueryParamsValues
): Promise<BlockedUserOut[]> {
    return apiGet<BlockedUserOut[]>(`/social/blocks${toQueryString(params)}`, {token})
}

export async function postBlock(
    token: string,
    target_user_id: number
): Promise<BlockStateResponse> {
    return apiPost<BlockStateResponse>(`/social/blocks/${target_user_id}`, undefined, {token})
}

export async function deleteBlock(
    token: string,
    target_user_id: number
): Promise<BlockStateResponse> {
    return apiDelete<BlockStateResponse>(`/social/blocks/${target_user_id}`, {token})
}

export async function postReport(
    token: string,
    target_user_id: number,
    payload: reportInputValue
): Promise<OkResponse> {
    return apiPost<OkResponse>(`/social/reports/${target_user_id}`, payload, {token})
}

export async function postVisit(
   token: string,
    target_user_id: number
): Promise<OkResponse> {
    return apiPost<OkResponse>(`/social/visits/${target_user_id}`, undefined, {token})
}