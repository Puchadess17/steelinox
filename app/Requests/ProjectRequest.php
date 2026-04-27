<?php
// app/Requests/ProjectRequest.php

/**
 * PROJECT REQUEST (VALIDACIÓN DE PROYECTOS)
 * ====================
 * Valida y sanitiza los datos de entrada para las operaciones sobre proyectos.
 * Contiene tres validadores diferenciados para las tres operaciones mutantes:
 *   - validateStore(): Alta de proyecto (campos obligatorios)
 *   - validateUpdate(): Edición parcial (solo valida lo que viene en el body)
 *   - validateStatusChange(): Transiciones de estado según normativa del DDS §4.3
 *   - validateApprovalConfirm(): Segundo paso del flujo de aprobación (token)
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class ProjectRequest extends BaseRequest {

    /**
     * VALIDACIÓN DE CREACIÓN
     * Campos obligatorios: client_id, name, project_type.
     * El presupuesto es opcional pero debe ser numérico si se envía.
     */
    public function validateStore() {
        $cleanName       = $this->sanitizeName($this->input('name'));
        $cleanProjectType = trim($this->input('project_type', ''));
        $budgetAmount    = trim($this->input('budget_amount', ''));

        if (empty($this->input('client_id'))) {
            $this->addError('client_id', 'El cliente es obligatorio.');
        }
        if (empty($cleanName)) {
            $this->addError('name', 'El nombre del proyecto es obligatorio.');
        }
        if ($cleanProjectType === '') {
            $this->addError('project_type', 'El tipo de proyecto es obligatorio.');
        }
        // El presupuesto es opcional; si se envía, debe ser un número
        if ($budgetAmount !== '' && !is_numeric($budgetAmount)) {
            $this->addError('budget_amount', 'El presupuesto debe ser un valor numérico.');
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE EDICIÓN PARCIAL (PATCH SEMANTICS)
     * Solo valida los campos que vienen en el body (null = no se envió = no se toca).
     * La referencia solo puede modificarla el admin y con formato PRJ-AAAA-XXXX.
     */
    public function validateUpdate($role) {
        if ($this->input('name') !== null) {
            $cleanName = $this->sanitizeName($this->input('name'));
            if (empty($cleanName)) {
                $this->addError('name', 'El nombre es obligatorio.');
            }
        }

        if ($this->input('project_type') !== null) {
            if (trim($this->input('project_type')) === '') {
                $this->addError('project_type', 'El tipo de proyecto es obligatorio.');
            }
        }

        if ($this->input('budget_amount') !== null) {
            $budgetAmount = trim($this->input('budget_amount'));
            if ($budgetAmount !== '' && !is_numeric($budgetAmount)) {
                $this->addError('budget_amount', 'El presupuesto debe ser un valor numérico.');
            }
        }
        
        // Solo el admin puede modificar la referencia y debe respetar el formato PRJ-AAAA-XXXX
        if ($role === 'admin' && !empty($this->input('reference'))) {
            if (!preg_match('/^PRJ-\d{4}-\d{4}$/', trim($this->input('reference')))) {
                $this->addError('reference', 'El formato debe ser PRJ-AAAA-XXXX');
            }
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE CAMBIO DE ESTADO
     * Comprueba que el nuevo estado sea válido, diferente al actual y que
     * la transición esté permitida por la normativa del DDS §4.3.
     * La reapertura desde 'cerrado' obliga a registrar un motivo.
     */
    public function validateStatusChange($oldStatus) {
        $newStatus = trim($this->input('status', ''));
        $reason    = trim($this->input('reason', ''));

        $validStatuses = ['propuesta', 'aprobado', 'ejecucion', 'cerrado'];
        if (!in_array($newStatus, $validStatuses)) {
            $this->addError('status', 'Estado no reconocido');
            return false;
        }

        if ($oldStatus === $newStatus) {
            $this->addError('status', 'Igual al actual.');
            return false;
        }

        // DDS §4.3: La reapertura desde 'cerrado' exige justificación registrada
        if ($oldStatus === 'cerrado' && empty($reason)) {
            $this->addError('reason', 'Por normativa, es estrictamente obligatorio registrar un motivo para reabrir un proyecto cerrado.');
            return false;
        }

        /**
         * MAPA DE TRANSICIONES PERMITIDAS (DDS §4.3)
         * Cualquier transición no contemplada en este mapa es ilegal y se bloquea.
         * La reapertura desde 'cerrado' puede volver a 'ejecucion' o 'propuesta'.
         */
        $allowedTransitions = [
            'propuesta' => ['aprobado', 'cerrado'],   
            'aprobado'  => ['ejecucion', 'cerrado'],  
            'ejecucion' => ['cerrado'],               
            'cerrado'   => ['ejecucion', 'propuesta'] // Reapertura con motivo
        ];

        if (!isset($allowedTransitions[$oldStatus]) || !in_array($newStatus, $allowedTransitions[$oldStatus])) {
            $this->addError('status', "Normativa de flujo: No se puede pasar directamente de '" . ucfirst($oldStatus) . "' a '" . ucfirst($newStatus) . "'.");
            return false;
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DEL SEGUNDO PASO DE APROBACIÓN
     * El token de confirmación de la doble aprobación es obligatorio.
     * Es generado en el paso 1 (requestApproval) y validado aquí en el paso 2.
     */
    public function validateApprovalConfirm() {
        $tokenInput = trim($this->input('token', ''));
        if (empty($tokenInput)) {
            $this->addError('token', 'El código de seguridad es obligatorio.');
        }
        return !$this->fails();
    }
}