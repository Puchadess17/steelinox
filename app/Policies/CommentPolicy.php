<?php
// app/Policies/CommentPolicy.php

class CommentPolicy
{
    public static function canView($role, $isVisibleToClient) {
        if ($role === 'cliente' && (int)$isVisibleToClient === 0) return false;
        return true;
    }

    public static function canCreateOnProject($projectStatus) {
        if ($projectStatus === 'cerrado') return false;
        return true;
    }

    public static function canCreateOnDocument($role, $isVisibleToClient) {
        if ($role === 'cliente' && (int)$isVisibleToClient === 0) return false;
        return true;
    }
}