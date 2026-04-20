<?php
// app/Requests/ProjectRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class ProjectRequest extends BaseRequest {
    
    public function validateStore() {
        $cleanName = $this->sanitizeName($this->input('name'));
        $cleanProjectType = trim($this->input('project_type', ''));
        $budgetAmount = trim($this->input('budget_amount', ''));

        if (empty($this->input('client_id'))) {
            $this->addError('client_id', 'El cliente es obligatorio.');
        }
        if (empty($cleanName)) {
            $this->addError('name', 'El nombre del proyecto es obligatorio.');
        }
        if ($cleanProjectType === '') {
            $this->addError('project_type', 'El tipo de proyecto es obligatorio.');
        }
        if ($budgetAmount === '' || !is_numeric($budgetAmount)) {
            $this->addError('budget_amount', 'El presupuesto es obligatorio y debe ser un valor numérico.');
        }

        return !$this->fails();
    }

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
            if ($budgetAmount === '' || !is_numeric($budgetAmount)) {
                $this->addError('budget_amount', 'El presupuesto es obligatorio y debe ser un valor numérico.');
            }
        }
        
        if ($role === 'admin' && !empty($this->input('reference'))) {
            if (!preg_match('/^PRJ-\d{4}-\d{4}$/', trim($this->input('reference')))) {
                $this->addError('reference', 'El formato debe ser PRJ-AAAA-XXXX');
            }
        }

        return !$this->fails();
    }

    public function validateStatusChange($oldStatus) {
        $newStatus = trim($this->input('status', ''));
        $reason = trim($this->input('reason', ''));

        $validStatuses = ['propuesta', 'aprobado', 'ejecucion', 'cerrado'];
        if (!in_array($newStatus, $validStatuses)) {
            $this->addError('status', 'Estado no reconocido');
            return false;
        }

        if ($oldStatus === $newStatus) {
            $this->addError('status', 'Igual al actual.');
            return false;
        }

        if ($oldStatus === 'cerrado' && empty($reason)) {
            $this->addError('reason', 'Por normativa, es estrictamente obligatorio registrar un motivo para reabrir un proyecto cerrado.');
            return false;
        }

        $allowedTransitions = [
            'propuesta' => ['aprobado'],         
            'aprobado'  => ['ejecucion'],        
            'ejecucion' => ['cerrado'],          
            'cerrado'   => ['ejecucion', 'propuesta'] 
        ];

        if (!isset($allowedTransitions[$oldStatus]) || !in_array($newStatus, $allowedTransitions[$oldStatus])) {
            $this->addError('status', "Normativa de flujo: No se puede pasar directamente de '" . ucfirst($oldStatus) . "' a '" . ucfirst($newStatus) . "'.");
            return false;
        }

        return !$this->fails();
    }

    public function validateApprovalConfirm() {
        $tokenInput = trim($this->input('token', ''));
        if (empty($tokenInput)) {
            $this->addError('token', 'El código de seguridad es obligatorio.');
        }
        return !$this->fails();
    }
}